// Shared Zipax UI pieces used by /app/zipax and /app/zipax/dev/[user].
// Lives outside the page file because Next.js rejects extra exports from
// a page module.

import Link from "next/link";
import { allTokens, fmtTokens, fmtUsd, type GroupTotal, type UserSecurity } from "@/lib/zipax.ts";

/**
 * A developer's laptop security posture, as a severity pill: "4 high",
 * "1 low", or "Clean". Links to the most severe device when one is known.
 * Renders a muted dash when the developer has no scanned device yet, so the
 * Zipax surfaces never imply a clean laptop we simply haven't scanned.
 */
export function SecurityBadge({
  sec,
  linkBase = "/app/devices",
}: {
  sec: UserSecurity | null | undefined;
  linkBase?: string;
}) {
  if (!sec || sec.devices === 0) {
    return <span className="muted small" title="No scan reported for this developer's device yet">—</span>;
  }
  const tier = sec.worst === "high" ? sec.high : sec.worst === "medium" ? sec.medium : sec.low;
  const label = sec.worst === "none" ? "Clean" : `${tier} ${sec.worst}`;
  const title =
    sec.worst === "none"
      ? `No findings across ${sec.devices} device${sec.devices === 1 ? "" : "s"}`
      : `${sec.high} high · ${sec.medium} medium · ${sec.low} low across ${sec.devices} device${sec.devices === 1 ? "" : "s"}`;
  const pill = (
    <span className={`pill ${sec.worst}`} title={title}>
      {label}
    </span>
  );
  return sec.linkDeviceId ? (
    <Link href={`${linkBase}/${sec.linkDeviceId}`} style={{ textDecoration: "none", color: "inherit" }}>
      {pill}
    </Link>
  ) : (
    pill
  );
}

export function GroupTable({
  rows,
  nameHeader,
  emptyMsg,
  linkBase,
}: {
  rows: GroupTotal<string>[];
  nameHeader: string;
  emptyMsg: string;
  linkBase?: string;
}) {
  if (rows.length === 0) {
    return <div className="panel-body"><p className="empty">{emptyMsg}</p></div>;
  }
  return (
    <div className="panel-body">
      <table className="data">
        <thead>
          <tr>
            <th>{nameHeader}</th>
            <th className="num">Tokens</th>
            <th className="num">Messages</th>
            <th className="num">Est. cost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td>
                {linkBase ? <Link href={`${linkBase}/${encodeURIComponent(r.key)}`}>{r.label}</Link> : r.label}
              </td>
              <td className="num">{fmtTokens(allTokens(r.totals))}</td>
              <td className="num">{fmtTokens(r.totals.messages)}</td>
              <td className="num">{fmtUsd(r.totals.costUsdCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RangePicker({ days, base }: { days: number; base: string }) {
  const choices = [7, 30, 90];
  return (
    <div className="range-picker">
      {choices.map((d) => (
        <Link
          key={d}
          href={d === 30 ? base : `${base}?days=${d}`}
          className={d === days ? "range-on" : ""}
          aria-current={d === days ? "page" : undefined}
        >
          {d} days
        </Link>
      ))}
    </div>
  );
}
