// Public builder-profile leaderboard. Only developers who turned a public
// profile on in /zipax/settings appear here. The scores and ranking are
// computed server-side by the zipax_public_leaderboard SQL function; this
// page never sees prompts, code, tokens, cost, projects or anyone's email.
//
// Filters (region, country, specialty) are applied server-side before the row
// cap, so a filtered board still shows the true top of that slice. Country and
// specialty are self-declared on each developer's profile — we never detect
// location.

import type { Metadata } from "next";
import Link from "next/link";
import { hasDatabase } from "@/lib/db.ts";
import {
  COUNTRIES,
  countryName,
  DIMENSION_LABEL,
  DIMENSIONS,
  KNOWN_TOOLS,
  toolLabel,
  type Dimension,
  flagEmoji,
  isKnownCountry,
  isKnownSpecialty,
  type LeaderboardRow,
  readPublicLeaderboard,
  type Region,
  REGIONS,
  SPECIALTIES,
  specialtyLabel,
} from "@/lib/zipax.ts";
import { filterSampleLeaderboard, SAMPLE_LEADERBOARD } from "@/lib/zipax-sample.ts";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Builder profile leaderboard",
  description: "A public ranking of developers by their opt-in Zipax builder profile.",
};

const SORTED_COUNTRIES = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));

export default async function PublicLeaderboard({
  searchParams,
}: {
  searchParams: Promise<{
    agent?: string;
    days?: string;
    dim?: string;
    region?: string;
    country?: string;
    specialty?: string;
  }>;
}) {
  const q = await searchParams;
  const days = pickDays(q.days);
  const agent = pickAgent(q.agent);
  const dim = pickDim(q.dim);
  const region = pickRegion(q.region);
  const country = pickCountry(q.country);
  const specialty = pickSpecialty(q.specialty);
  const filter = { region: region || null, country: country || null, specialty: specialty || null };

  // Demo mode (no database): render a fabricated sample set so the board and
  // its filters are explorable without a tenant. Real deployments read opt-in
  // profiles from the SECURITY DEFINER leaderboard function.
  const demo = !hasDatabase();
  const rows = demo
    ? filterSampleLeaderboard(SAMPLE_LEADERBOARD, filter).filter(r => !agent || r.primaryTool === agent)
    : await readPublicLeaderboard(days, 100, filter, agent);
  const ranked = sortByDim(rows, dim);

  return (
    <div className="wrap">
      <div className="page-head">
        <h1>Builder profile leaderboard</h1>
        <p className="muted">
          Ranks developers and the AI coding agents they work with. Scores come from each
          developer's opt-in Zipax builder profile over the last {days} days. Only people who
          turned a public profile on in <Link href="/zipax/settings">Zipax settings</Link> appear
          here. Scores are computed on each developer's laptop from local coding sessions — no
          prompts, no code, no project names.
        </p>
        {demo ? (
          <p className="callout small" style={{ marginTop: 10 }}>
            Showing <b>sample data</b> — this console is running without a database. On a real
            deployment this lists developers who opted in via <Link href="/zipax/settings">Zipax settings</Link>.
          </p>
        ) : null}
        <FilterBar agent={agent} days={days} dim={dim} region={region} country={country} specialty={specialty} />
      </div>

      {ranked.length === 0 ? (
        <section className="panel">
          <div className="panel-body">
            <p className="empty">
              {region || country || specialty ? (
                <>
                  No published developers match this filter. Try widening it, or{" "}
                  <Link href="/leaderboard">clear all filters</Link>.
                </>
              ) : (
                <>
                  Nobody has published a profile yet. Run <code>zinloop zipax</code> on your laptop,
                  visit the printed <code>/zipax/claim</code> URL, then turn public sharing on in{" "}
                  <Link href="/zipax/settings">Zipax settings</Link> to appear here.
                </>
              )}
            </p>
          </div>
        </section>
      ) : (
        <section className="panel">
          <div className="panel-body">
            <LeaderboardTable rows={ranked} activeDim={dim} />
          </div>
        </section>
      )}
    </div>
  );
}

function FilterBar({
  agent,
  days,
  dim,
  region,
  country,
  specialty,
}: {
  agent: string;
  days: number;
  dim: Dimension | "overall";
  region: Region | "";
  country: string;
  specialty: string;
}) {
  return (
    <form method="GET" action="/leaderboard" className="lb-filters">
      <label><span>Agent</span><select name="agent" defaultValue={agent}><option value="">All agents</option>{KNOWN_TOOLS.map(t => <option key={t} value={t}>{toolLabel(t)}</option>)}</select></label>
      <label>
        <span>Window</span>
        <select name="days" defaultValue={String(days)}>
          <option value="7">7 days</option>
          <option value="30">30 days</option>
          <option value="90">90 days</option>
        </select>
      </label>
      <label>
        <span>Dimension</span>
        <select name="dim" defaultValue={dim}>
          <option value="overall">Overall</option>
          {DIMENSIONS.map((d) => (
            <option key={d} value={d}>{DIMENSION_LABEL[d]}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Region</span>
        <select name="region" defaultValue={region}>
          <option value="">All regions</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Country</span>
        <select name="country" defaultValue={country}>
          <option value="">All countries</option>
          {SORTED_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Specialty</span>
        <select name="specialty" defaultValue={specialty}>
          <option value="">All specialties</option>
          {SPECIALTIES.map((s) => (
            <option key={s.slug} value={s.slug}>{s.label}</option>
          ))}
        </select>
      </label>
      <div className="lb-filters-actions">
        <button type="submit">Apply</button>
        <Link href="/leaderboard" className="muted small">Clear</Link>
      </div>
      {country && region ? (
        <p className="muted small lb-filters-note">
          Country narrows within the region when both are set.
        </p>
      ) : null}
    </form>
  );
}

function LeaderboardTable({
  rows,
  activeDim,
}: {
  rows: LeaderboardRow[];
  activeDim: Dimension | "overall";
}) {
  return (
    <table className="data">
      <thead>
        <tr>
          <th className="num">#</th>
          <th>Developer</th>
          <th>Agent</th>
          <th>Where</th>
          <th>Focus</th>
          <th className="num">Overall</th>
          {DIMENSIONS.map((d) => (
            <th key={d} className={`num ${d === activeDim ? "active" : ""}`}>{DIMENSION_LABEL[d]}</th>
          ))}
          <th className="num">Sessions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.userHash}>
            <td className="num">{i + 1}</td>
            <td>
              {r.publicSlug ? (
                <Link href={`/p/${r.publicSlug}`}>{r.displayName}</Link>
              ) : (
                <span>{r.displayName}</span>
              )}
            </td>
            <td><AgentBadge primaryTool={r.primaryTool} toolSessions={r.toolSessions} /></td>
            <td>
              {r.country ? (
                <span title={countryName(r.country)}>
                  <span aria-hidden="true">{flagEmoji(r.country)}</span>{" "}
                  <span className="muted small">{r.country.toUpperCase()}</span>
                </span>
              ) : (
                <span className="muted">—</span>
              )}
            </td>
            <td>
              {r.specialty ? (
                <span className="tag">{specialtyLabel(r.specialty)}</span>
              ) : (
                <span className="muted">—</span>
              )}
            </td>
            <td className="num">
              {r.showMeanScore ? <ScorePill n={r.meanScore} /> : <span className="muted" title="Hidden by the developer">—</span>}
            </td>
            {DIMENSIONS.map((d) => {
              const isPublic = r.publicDims.includes(d);
              const s = r.dimScores[d];
              return (
                <td key={d} className={`num ${d === activeDim ? "active" : ""}`}>
                  {isPublic && typeof s === "number" ? <ScorePill n={s} /> : <span className="muted">—</span>}
                </td>
              );
            })}
            <td className="num">
              {r.showSessions ? r.sessions : <span className="muted" title="Hidden by the developer">—</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AgentBadge({
  primaryTool,
  toolSessions,
}: {
  primaryTool: string | null;
  toolSessions: Record<string, number>;
}) {
  if (!primaryTool) return <span className="muted">—</span>;
  const others = Object.entries(toolSessions)
    .filter(([t]) => t !== primaryTool)
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => toolLabel(t));
  const title =
    others.length > 0 ? `Primary agent — also uses ${others.join(", ")}` : "Primary coding agent";
  return (
    <span className={`agent-badge agent-${primaryTool}`} title={title}>
      {toolLabel(primaryTool)}
      {others.length > 0 ? <span className="agent-plus"> +{others.length}</span> : null}
    </span>
  );
}

function AgentPicker({
  current,
  days,
  dim,
}: {
  current: string;
  days: number;
  dim: Dimension | "overall";
}) {
  const options: { value: string; label: string }[] = [
    { value: "", label: "All agents" },
    ...KNOWN_TOOLS.map((t) => ({ value: t, label: toolLabel(t) })),
  ];
  const href = (v: string) => {
    const parts: string[] = [];
    if (v !== "") parts.push(`agent=${encodeURIComponent(v)}`);
    if (dim !== "overall") parts.push(`dim=${dim}`);
    if (days !== 30) parts.push(`days=${days}`);
    return parts.length ? `/leaderboard?${parts.join("&")}` : "/leaderboard";
  };
  return (
    <div className="range-picker">
      {options.map((o) => (
        <Link
          key={o.value || "all"}
          href={href(o.value)}
          className={o.value === current ? "range-on" : ""}
          aria-current={o.value === current ? "page" : undefined}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}

function ScorePill({ n }: { n: number }) {
  const band = n >= 75 ? "high" : n >= 50 ? "medium" : n >= 25 ? "low" : "none";
  return <span className={`pill ${band}`}>{n}</span>;
}

function DimPicker({
  current,
  days,
  agent,
}: {
  current: Dimension | "overall";
  days: number;
  agent: string;
}) {
  const options: { value: Dimension | "overall"; label: string }[] = [
    { value: "overall", label: "Overall" },
    ...DIMENSIONS.map((d) => ({ value: d, label: DIMENSION_LABEL[d] })),
  ];
  const base = (v: Dimension | "overall") => {
    const parts: string[] = [];
    if (v !== "overall") parts.push(`dim=${v}`);
    if (days !== 30) parts.push(`days=${days}`);
    if (agent !== "") parts.push(`agent=${encodeURIComponent(agent)}`);
    return parts.length ? `/leaderboard?${parts.join("&")}` : "/leaderboard";
  };
  return (
    <div className="range-picker">
      {options.map((o) => (
        <Link
          key={o.value}
          href={base(o.value)}
          className={o.value === current ? "range-on" : ""}
          aria-current={o.value === current ? "page" : undefined}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}

function pickDays(raw: string | undefined): number {
  const n = Number(raw);
  if (n === 7 || n === 30 || n === 90) return n;
  return 30;
}

function pickDim(raw: string | undefined): Dimension | "overall" {
  if (!raw) return "overall";
  const ok = (DIMENSIONS as readonly string[]).includes(raw);
  return ok ? (raw as Dimension) : "overall";
}

function pickAgent(raw: string | undefined): string {
  if (!raw) return "";
  const v = raw.toLowerCase().trim();
  return (KNOWN_TOOLS as readonly string[]).includes(v) ? v : "";
}

function pickRegion(raw: string | undefined): Region | "" {
  return raw && (REGIONS as readonly string[]).includes(raw) ? (raw as Region) : "";
}

function pickCountry(raw: string | undefined): string {
  const c = (raw ?? "").toLowerCase().trim();
  return isKnownCountry(c) ? c : "";
}

function pickSpecialty(raw: string | undefined): string {
  const s = (raw ?? "").toLowerCase().trim();
  return isKnownSpecialty(s) ? s : "";
}

function sortByDim(rows: LeaderboardRow[], dim: Dimension | "overall"): LeaderboardRow[] {
  if (dim === "overall") return rows;
  return [...rows]
    .filter((r) => typeof r.dimScores[dim] === "number")
    .sort((a, b) => (b.dimScores[dim] ?? 0) - (a.dimScores[dim] ?? 0));
}
