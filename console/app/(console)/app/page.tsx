import Link from "next/link";
import { loadOverview, loadTrend } from "@/lib/data.ts";
import { attention } from "@/lib/insights.ts";
import { TrendChart } from "@/components/TrendChart.tsx";
import { countRisk, keyCounts } from "@/lib/risk.ts";
import { ConsoleIcon } from "@/components/ConsoleIcon.tsx";
import { OverviewClients } from "@/components/OverviewClients.tsx";
import { GetStarted } from "@/components/GetStarted.tsx";

export const dynamic = "force-dynamic";

export default async function Overview({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const [{ demo, mspName, clients }, trend] = await Promise.all([loadOverview(), loadTrend(90)]);
  const welcome = (await searchParams).welcome === "1";
  const all = clients.flatMap((c) => c.agents);
  const totals = countRisk(all);
  const devices = clients.reduce((n, c) => n + c.devices, 0);
  const scanned = clients.reduce((n, c) => n + c.devicesScanned, 0);
  const revocable = all.filter((a) => a.revocable && a.findings.some((f) => f.severity === "high")).length;
  const keys = keyCounts(all);
  // The demo data is frozen in time, so measure "ago" from its own clock.
  const now = demo ? new Date("2026-10-24T09:00:00Z") : new Date();
  const todo = attention(clients, now);
  const hasTrend = trend.length >= 2 && trend.some((p) => p.tools > 0);

  return (
    <>
      <div className="page-head">
        <p className="overview-eyebrow">YOUR SECURITY WORKSPACE</p>
        <div className="overview-heading"><div><h1>Clarity. Across every client.</h1><p className="muted">Your AI security posture, and what to do next.</p></div><Link className="btn demo-btn" href="/app/demo"><ConsoleIcon name="play" size={16}/> Watch product tour</Link></div>
        <p className="muted">
          {mspName} · {clients.length} clients · Endpoint scans & Microsoft 365
        </p>
        <div className="actions">{!demo && <Link className="btn" href="/app/clients/new">Add a client</Link>}<Link className="btn" href="/app/devices">View devices</Link><Link className="btn primary" href="/app/downloads"><ConsoleIcon name="downloads" size={16}/> Get scanner</Link></div>
      </div>

      {!demo && <GetStarted clients={clients} showAlways={welcome} />}

      {clients.length > 0 && (
        <section className="tiles" aria-label="Summary">
          <Link className="tile stat-link" href="/app/tools"><div className="stat-label">AI tools discovered<ConsoleIcon name="tools"/></div><b>{totals.total}</b><span>Across your client portfolio</span></Link>
          <Link className="tile high stat-link" href="/app/findings?risk=high"><div className="stat-label">High-risk tools<ConsoleIcon name="findings"/></div><b>{totals.high}</b><span>Prioritize these for review</span></Link>
          <Link className="tile stat-link" href="/app/findings"><div className="stat-label">Access to review<ConsoleIcon name="agents"/></div><b>{revocable}</b><span>High-risk, revocable M365 grants</span></Link>
          <Link className="tile stat-link" href="/app/devices"><div className="stat-label">Scan coverage<ConsoleIcon name="devices"/></div><b>{devices > 0 ? Math.round((scanned / devices) * 100) : 0}<small>%</small></b><span>{scanned.toLocaleString("en-US")} of {devices.toLocaleString("en-US")} devices scanned</span></Link>
        </section>
      )}

      {clients.length > 0 && (
        <div className="split">
          <section className="panel">
            <div className="panel-head">
              <h2>Risk over time</h2>
              <span className="muted small">High & medium risk · Last 90 days</span>
            </div>
            {hasTrend ? <TrendChart points={trend} /> : <p className="empty">The chart fills in as laptops report and Microsoft 365 is checked, one point a day.</p>}
          </section>
          <section className="panel">
            <div className="panel-head">
              <h2>Needs attention</h2>
              <span className="muted small">{todo.length === 0 ? "Nothing right now" : `${todo.length} ${todo.length === 1 ? "item" : "items"}`}</span>
            </div>
            {todo.length === 0 ? (
              <p className="empty">Every client is scanned and nothing is high risk.</p>
            ) : (
              <ul className="attention">
                {todo.slice(0, 4).map((t, i) => (
                  <li key={`${t.clientId}-${t.kind}-${i}`} className={`attention-${t.kind}`}>
                    <Link href={`/app/clients/${t.clientId}`}>{t.clientName}</Link>
                    <span>{t.text}</span>
                  </li>
                ))}
                {todo.length > 4 && <li className="muted small"><Link href="/app/clients">View {todo.length - 4} more across clients →</Link></li>}
              </ul>
            )}
          </section>
        </div>
      )}

      {clients.length > 0 && (
      <section className="panel">
        <div className="panel-head">
          <h2>Credential protection</h2>
          <span className="muted small">Track exposed keys from discovery to rotation</span>
        </div>
        <div className="keys-flow">
          <div><b className="bad">{keys.plain}</b><span>servers with keys in plain text</span><small>Move keys into the device’s password store</small></div>
          <div><b className="warn">{keys.toReplace}</b><span>protected, old key still needs replacing</span><small>Rotate the original key with its provider</small></div>
          <div><b className="good">{keys.done}</b><span>servers with all keys protected and replaced</span><small>Nothing to do</small></div>
        </div>
      </section>
      )}

      <OverviewClients clients={clients} />
    </>
  );
}
