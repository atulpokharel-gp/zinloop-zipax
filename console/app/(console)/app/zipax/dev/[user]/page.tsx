// Zipax per-developer page: one developer's AI coding habits, from the MSP
// side. The developer's own personal view lives under /portal/zipax.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasDatabase } from "@/lib/db.ts";
import { requireSession } from "@/lib/session.ts";
import {
  allTokens,
  type DeviceSecurity,
  fmtTokens,
  fmtUsd,
  userDeviceSecurity,
  userProfile,
  userRollup,
} from "@/lib/zipax.ts";
import { severityLabel } from "@/lib/risk.ts";
import { GroupTable, RangePicker } from "../../_shared.tsx";
import { ProfilePanel } from "@/components/ProfilePanel.tsx";

export const metadata: Metadata = { title: "Zipax — Developer" };
export const dynamic = "force-dynamic";

export default async function ZipaxDev({
  params,
  searchParams,
}: {
  params: Promise<{ user: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  if (!hasDatabase()) return notFound();
  const session = await requireSession();
  const { user } = await params;
  const q = await searchParams;
  const days = pickDays(q.days);
  const userHash = decodeURIComponent(user).toLowerCase();
  if (!/^[0-9a-f]{16,64}$/.test(userHash)) return notFound();
  const [data, profile, devices] = await Promise.all([
    userRollup(session.mspId, userHash, days),
    userProfile(session.mspId, userHash, days),
    userDeviceSecurity(session.mspId, userHash, days),
  ]);
  const label = data.byUser[0]?.label ?? profile?.userLabel ?? userHash.slice(0, 10);
  return (
    <>
      <div className="page-head">
        <h1>{label}</h1>
        <p className="muted">AI coding habits for one developer, last {days} days.</p>
        <RangePicker days={days} base={`/app/zipax/dev/${userHash}`} />
      </div>
      <section className="tiles">
        <div className="tile">
          <span>Total tokens</span>
          <b>{fmtTokens(allTokens(data.totals))}</b>
          <span className="muted">{fmtUsd(data.totals.costUsdCents)}</span>
        </div>
        <div className="tile">
          <span>Messages</span>
          <b>{fmtTokens(data.totals.messages)}</b>
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><h2>Builder profile</h2></div>
        <ProfilePanel
          dims={profile?.dims ?? []}
          caption="Scored on the laptop from local Claude Code sessions. 0 means no signal yet; 100 is the top of the heuristic."
        />
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Laptop security</h2></div>
        <DeviceSecurityTable devices={devices} />
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Tools used</h2></div>
        <GroupTable rows={data.byTool} nameHeader="Tool" emptyMsg="Nothing yet." />
      </section>
      <section className="panel">
        <div className="panel-head"><h2>Projects</h2></div>
        <GroupTable rows={data.byProject} nameHeader="Project" emptyMsg="No projects yet." />
      </section>
    </>
  );
}

function DeviceSecurityTable({ devices }: { devices: DeviceSecurity[] }) {
  if (devices.length === 0) {
    return (
      <div className="panel-body">
        <p className="empty">
          No Zinloop scan has reported for this developer&rsquo;s device(s) yet. Run{" "}
          <code>zinloop</code> on the laptop to connect its security posture here.
        </p>
      </div>
    );
  }
  return (
    <div className="panel-body">
      <table className="data">
        <thead>
          <tr>
            <th>Device</th>
            <th>Risk</th>
            <th className="num">High</th>
            <th className="num">Medium</th>
            <th className="num">Low</th>
            <th>Last scan</th>
          </tr>
        </thead>
        <tbody>
          {devices.map((d) => (
            <tr key={d.deviceId}>
              <td><Link href={`/app/devices/${d.deviceId}`}>{d.hostname}</Link></td>
              <td><span className={`pill ${d.worst}`}>{severityLabel(d.worst)}</span></td>
              <td className="num">{d.high || <span className="muted">—</span>}</td>
              <td className="num">{d.medium || <span className="muted">—</span>}</td>
              <td className="num">{d.low || <span className="muted">—</span>}</td>
              <td className="muted small">{d.lastScan ? d.lastScan.slice(0, 10) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function pickDays(raw: string | undefined): number {
  const n = Number(raw);
  if (n === 7 || n === 30 || n === 90) return n;
  return 30;
}
