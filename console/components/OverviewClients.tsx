"use client";
import Link from "next/link";
import { useState } from "react";
import type { Client } from "@/lib/types.ts";
import { countRisk, clientScore } from "@/lib/risk.ts";
import { RiskPill } from "./RiskPill.tsx";
import { ConsoleIcon } from "./ConsoleIcon.tsx";

export function OverviewClients({ clients }: { clients: Client[] }) {
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState("all");
  const rows = clients.map(c => ({ c, r: countRisk(c.agents), score: clientScore(c) }))
    .filter(({c,r}) => `${c.name} ${c.industry}`.toLowerCase().includes(query.trim().toLowerCase()) && (risk !== "high" || r.high > 0))
    .sort((a,b) => b.score - a.score);
  return <section className="panel client-overview">
    <div className="panel-head"><div><h2>Client security</h2><p className="muted small">Your portfolio, prioritized by risk.</p></div><Link className="text-link" href="/app/clients">All clients <ConsoleIcon name="arrow" size={15} /></Link></div>
    <div className="overview-toolbar">
      <label className="overview-search"><ConsoleIcon name="search" size={17} /><span className="sr-only">Search clients</span><input type="search" placeholder="Search clients…" value={query} onChange={e => setQuery(e.target.value)} /></label>
      <label className="overview-filter"><span className="sr-only">Filter clients by risk</span><select value={risk} onChange={e => setRisk(e.target.value)}><option value="all">All risk levels</option><option value="high">High risk</option></select></label>
      <span className="muted small" role="status">{rows.length} clients</span>
    </div>
    <div className="table-wrap"><table><thead><tr><th>Client</th><th>Risk score</th><th>Tool risk</th><th>AI tools</th><th>Scan coverage</th><th><span className="sr-only">View client</span></th></tr></thead>
      <tbody>{rows.map(({c,r,score}, i) => <tr key={c.id} className="link-row">
        <td><div className="client-identity"><span className={`client-avatar avatar-${i % 4}`} aria-hidden="true">{c.name.split(" ").slice(0,2).map(w=>w[0]).join("")}</span><div><Link className="row-link" href={`/app/clients/${c.id}`}>{c.name}</Link><div className="muted small">{c.industry}</div></div></div></td>
        <td><div className="score"><div className="score-track"><div className="score-fill" style={{width:`${score}%`,background:score>=50?"var(--high)":score>=20?"var(--medium)":"var(--clean)"}} /></div><span className="score-num">{score}<span className="muted"> / 100</span></span></div></td>
        <td><div className="counts">{r.high>0&&<RiskPill risk="high" count={r.high}/ >}{r.medium>0&&<RiskPill risk="medium" count={r.medium}/ >}{r.high+r.medium===0&&<RiskPill risk="none"/>}</div></td>
        <td className="num">{r.total}</td><td><span className="coverage-number">{c.devicesScanned} <span className="muted">/ {c.devices}</span></span><div className="coverage-track"><span style={{width:`${c.devices?Math.min(100,c.devicesScanned/c.devices*100):0}%`}} /></div></td>
        <td><Link className="client-open" href={`/app/clients/${c.id}`} aria-label={`View ${c.name}`}><ConsoleIcon name="arrow" size={17}/></Link></td>
      </tr>)}</tbody></table></div>
    {rows.length===0&&<div className="empty"><h3>No matching clients</h3><p className="muted">Try another name or risk level.</p><button className="btn" onClick={()=>{setQuery("");setRisk("all");}}>Clear filters</button></div>}
  </section>;
}
