import Link from "next/link";
import { loadOverview } from "@/lib/data.ts";
import { clientScore, countRisk } from "@/lib/risk.ts";
import { RiskPill } from "@/components/RiskPill.tsx";

export const dynamic = "force-dynamic";

function timeAgo(iso: string, now: Date): string {
  if (new Date(iso).getTime() <= 0) return "never";
  const h = Math.round((now.getTime() - new Date(iso).getTime()) / 3_600_000);
  if (h <= 0) return "just now";
  return h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

export default async function ClientsIndex() {
  const { demo, clients } = await loadOverview();
  const now = demo ? new Date("2026-10-24T09:00:00Z") : new Date();

  const rows = clients
    .map((c) => ({ c, risk: countRisk(c.agents), score: clientScore(c) }))
    .sort((a, b) => b.score - a.score);

  return (
    <>
      <p className="small">
        <Link href="/app">← Overview</Link>
      </p>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="stack" style={{ gap: 24 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12 }}>
            <div className="stack" style={{ gap: 4 }}>
              <h1 className="disp h2">Clients</h1>
              <p className="muted small">{rows.length === 0 ? "No clients yet." : `${rows.length} client${rows.length === 1 ? "" : "s"}, highest risk first.`}</p>
            </div>
            {!demo && (
              <Link className="zbtn zbtn-main" href="/app/clients/new">
                Add client
              </Link>
            )}
          </div>

          {rows.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: 32 }}>
              <h2 className="h3">Add your first client</h2>
              <p className="muted">A client is one company whose laptops you scan. You can add one now, or jump into the demo via the Overview.</p>
              {!demo && (
                <p style={{ marginTop: 16 }}>
                  <Link className="zbtn zbtn-main" href="/app/clients/new">
                    Add client
                  </Link>
                </p>
              )}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Industry</th>
                    <th style={{ textAlign: "right" }}>Devices</th>
                    <th style={{ textAlign: "right" }}>Scanned</th>
                    <th>Risk</th>
                    <th>Last scan</th>
                    <th aria-label="Open" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ c, risk }) => (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/app/clients/${c.id}`} className="link">
                          <b>{c.name}</b>
                        </Link>
                      </td>
                      <td className="muted">{c.industry || "—"}</td>
                      <td style={{ textAlign: "right" }}>{c.devices}</td>
                      <td style={{ textAlign: "right" }}>
                        {c.devicesScanned}
                        {c.devicesScanned < c.devices && (
                          <span className="muted small"> / {c.devices}</span>
                        )}
                      </td>
                      <td>
                        {risk.high > 0 ? (
                          <RiskPill risk="high" count={risk.high} />
                        ) : risk.medium > 0 ? (
                          <RiskPill risk="medium" count={risk.medium} />
                        ) : risk.low > 0 ? (
                          <RiskPill risk="low" count={risk.low} />
                        ) : (
                          <RiskPill risk="none" />
                        )}
                      </td>
                      <td className="muted small">{timeAgo(c.lastScan, now)}</td>
                      <td style={{ textAlign: "right" }}>
                        <Link href={`/app/clients/${c.id}`} className="link small">
                          Open →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
