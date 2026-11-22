// Counts HIGH/MEDIUM/LOW findings in a raw scanner report, straight from the
// stored `scans.report` jsonb. Pure (no DB, no session), so it can be unit
// tested and reused wherever we have a report but not a built Endpoint.
//
// It mirrors how lib/device-inventory.ts tallies a device's severity: server
// findings (via importScan) plus the skill and tool findings the inventory
// supplement surfaces. Keep the two in step — if one starts counting another
// finding source (e.g. pathWarnings), the other should too.

import { importScan } from "./scan-import.ts";
import type { Severity } from "./types.ts";

export interface SeverityCounts {
  high: number;
  medium: number;
  low: number;
}

export function emptyCounts(): SeverityCounts {
  return { high: 0, medium: 0, low: 0 };
}

const sev = (v: unknown): Severity =>
  v === "high" || v === "medium" || v === "low" ? v : "none";

/** Worst severity present in a tally. "none" when nothing was found. */
export function worstSeverity(c: SeverityCounts): Severity {
  if (c.high > 0) return "high";
  if (c.medium > 0) return "medium";
  if (c.low > 0) return "low";
  return "none";
}

/** True when the tally has at least one finding at any level. */
export function anyFindings(c: SeverityCounts): boolean {
  return c.high + c.medium + c.low > 0;
}

/**
 * Tally a raw scanner report. Counts server findings through importScan and
 * skill/tool findings directly off the report, so an unsupported server shape
 * (importScan throws) still contributes its skill/tool findings.
 */
export function reportSeverityCounts(raw: unknown): SeverityCounts {
  const counts = emptyCounts();
  if (!raw || typeof raw !== "object") return counts;
  const bump = (s: Severity) => {
    if (s === "high") counts.high++;
    else if (s === "medium") counts.medium++;
    else if (s === "low") counts.low++;
  };

  try {
    const imported = importScan(raw);
    for (const a of imported.agents) for (const f of a.findings) bump(f.severity);
  } catch {
    // Unsupported or malformed server block — skills/tools below may still count.
  }

  const r = raw as Record<string, unknown>;
  for (const key of ["skills", "tools"] as const) {
    const arr = r[key];
    if (!Array.isArray(arr)) continue;
    for (const item of arr.slice(0, 500)) {
      if (!item || typeof item !== "object") continue;
      const fs = (item as Record<string, unknown>).findings;
      if (!Array.isArray(fs)) continue;
      for (const f of fs.slice(0, 100)) {
        if (f && typeof f === "object") bump(sev((f as Record<string, unknown>).severity));
      }
    }
  }
  return counts;
}
