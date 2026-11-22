// Demo data for the public builder-profile leaderboard, shown when the console
// runs without a database (hasDatabase() === false) — the same demo-mode
// pattern lib/device-inventory.ts uses for the security views. None of this is
// real: the hashes are fabricated, the handles are invented, and nothing here
// is ever written to a database.
//
// The set is deliberately varied across regions, countries and specialties so
// the leaderboard's filters have something to bite on in a demo.

import {
  countriesInRegion,
  type Dimension,
  type LeaderboardFilter,
  type LeaderboardRow,
  REGIONS,
} from "./zipax.ts";

function hex(seed: string): string {
  // A stable 32-hex pseudo-id from a short seed — only needs to look like a
  // user_hash and stay unique within this sample.
  let out = "";
  for (let i = 0; i < 32; i++) {
    const c = seed.charCodeAt(i % seed.length) + i * 7;
    out += (c % 16).toString(16);
  }
  return out;
}

function dims(
  steering: number,
  execution: number,
  engineering: number,
  product: number,
  planning: number,
): Partial<Record<Dimension, number>> {
  return {
    steering,
    execution,
    engineering,
    "product-instinct": product,
    planning,
  };
}

function mean(d: Partial<Record<Dimension, number>>): number {
  const vals = Object.values(d).filter((v): v is number => typeof v === "number");
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
}

interface SampleSpec {
  handle: string;
  slug: string | null;
  country: string;
  specialty: string;
  d: Partial<Record<Dimension, number>>;
  sessions: number;
  showMeanScore?: boolean;
  showSessions?: boolean;
}

const SPECS: SampleSpec[] = [
  { handle: "asha", slug: "asha", country: "in", specialty: "backend", d: dims(88, 91, 86, 70, 83), sessions: 142 },
  { handle: "mateo", slug: "mateo", country: "mx", specialty: "fullstack", d: dims(82, 80, 78, 85, 76), sessions: 96 },
  { handle: "lena", slug: "lena", country: "de", specialty: "ml-ai", d: dims(90, 79, 88, 72, 91), sessions: 120 },
  { handle: "kwame", slug: "kwame", country: "gh", specialty: "mobile", d: dims(74, 83, 70, 88, 69), sessions: 61 },
  { handle: "yuki", slug: "yuki", country: "jp", specialty: "frontend", d: dims(79, 72, 68, 92, 74), sessions: 110 },
  { handle: "sofia", slug: "sofia", country: "br", specialty: "devops", d: dims(85, 88, 90, 64, 80), sessions: 134 },
  { handle: "omar", slug: "omar", country: "ae", specialty: "security", d: dims(91, 76, 93, 61, 86), sessions: 72 },
  { handle: "nadia", slug: "nadia", country: "pl", specialty: "data", d: dims(77, 81, 84, 70, 88), sessions: 88 },
  { handle: "liam", slug: "liam", country: "ie", specialty: "fullstack", d: dims(70, 74, 72, 79, 66), sessions: 54 },
  { handle: "grace", slug: "grace", country: "au", specialty: "frontend", d: dims(83, 69, 71, 90, 72), sessions: 77 },
  { handle: "chen", slug: "chen", country: "sg", specialty: "backend", d: dims(86, 85, 82, 68, 79), sessions: 103 },
  { handle: "amara", slug: "amara", country: "ng", specialty: "ml-ai", d: dims(80, 78, 85, 66, 84), sessions: 69 },
  { handle: "noah", slug: "noah", country: "us", specialty: "devops", d: dims(84, 90, 87, 62, 81), sessions: 151 },
  // An anonymous developer: published to the board but with the display name
  // and overall hidden, to show those privacy toggles in the demo.
  { handle: "Anonymous developer", slug: null, country: "ca", specialty: "security", d: dims(72, 70, 75, 58, 77), sessions: 40, showMeanScore: false, showSessions: false },
];

export const SAMPLE_LEADERBOARD: LeaderboardRow[] = SPECS.map((s, i) => ({
  userHash: hex(s.handle + s.country),
  displayName: s.handle,
  publicSlug: s.slug,
  publicDims: Object.keys(s.d) as Dimension[],
  dimScores: s.d,
  meanScore: mean(s.d),
  sessions: s.sessions,
  primaryTool: ["claude-code", "codex", "cursor"][i % 3],
  toolSessions: { [["claude-code", "codex", "cursor"][i % 3]]: s.sessions },
  showMeanScore: s.showMeanScore ?? true,
  showSessions: s.showSessions ?? true,
  country: s.country,
  specialty: s.specialty,
}));

/** Applies the same region/country/specialty filter the SQL path does, in JS. */
export function filterSampleLeaderboard(
  rows: LeaderboardRow[],
  filter: LeaderboardFilter,
): LeaderboardRow[] {
  const country = (filter.country ?? "").toLowerCase().trim();
  const specialty = (filter.specialty ?? "").toLowerCase().trim();
  let codes: Set<string> | null = null;
  if (country) {
    codes = new Set([country]);
  } else if (filter.region && REGIONS.includes(filter.region)) {
    codes = new Set(countriesInRegion(filter.region));
  }
  return rows.filter((r) => {
    if (codes && !(r.country && codes.has(r.country))) return false;
    if (specialty && r.specialty !== specialty) return false;
    return true;
  });
}
