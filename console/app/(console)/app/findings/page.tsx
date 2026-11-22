import type { Metadata } from "next";
import { loadOverview } from "@/lib/data.ts";
import { FindingsExplorer } from "@/components/FindingsExplorer.tsx";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Security findings · Zinloop"};
export default async function FindingsPage({searchParams}:{searchParams:Promise<{risk?:string}>}) {
  const {risk}=await searchParams;
  const {clients}=await loadOverview();
  return <>
    <div className="page-head"><h1>Security findings</h1><p className="muted">Review, filter, and investigate high-confidence issues across customers. Every finding links back to its client.</p></div>
    <FindingsExplorer clients={clients} initialSeverity={risk==="high"||risk==="medium"||risk==="low"?risk:"all"}/>
  </>;
}
