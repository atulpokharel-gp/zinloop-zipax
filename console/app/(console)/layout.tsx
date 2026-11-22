import type { Metadata } from "next";
import Link from "next/link";
import { MSP_NAME } from "@/lib/sample-data.ts";
import { hasDatabase } from "@/lib/db.ts";
import { currentSession } from "@/lib/session.ts";
import { signOutAction } from "@/app/(site)/login/actions.ts";
import { Logo } from "@/components/Logo.tsx";
import { ConsoleNavigation } from "@/components/ConsoleNavigation.tsx";
import "./console-shell.css";

export const metadata: Metadata = {title:"Zinloop Security Console"};
export const dynamic="force-dynamic";

export default async function ConsoleLayout({children}:{children:React.ReactNode}) {
  const demo=!hasDatabase();
  const session=demo?null:await currentSession();
  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <div className="console-shell">
      <aside className="console-sidebar">
        <Link href="/app" className="brand"><Logo size={30}/><span>Zinloop<span className="brand-caption">SECURITY WORKSPACE</span></span></Link>
        <div className="workspace-switch"><span className="workspace-avatar">{(session?.mspName||MSP_NAME).slice(0,1)}</span><div><b>{session?.mspName||MSP_NAME}</b><span>{demo?"Demo workspace":"Security operations"}</span></div></div>
        {(demo||session)&&<ConsoleNavigation settingsVisible={Boolean(session)}/>}
        <div className="console-sidebar-bottom"><Link href="/app/downloads">Get endpoint scanner →</Link><p>Local-first. Privacy-conscious.<br/>Windows · macOS · Linux</p></div>
      </aside>
      <div className="console-workspace">
        <header className="console-topbar">
          <span className="console-topbar-title">Workspace <span aria-hidden="true">/</span> <b>Security operations</b></span>
          <div className="console-topbar-right">
            {demo&&<span className="msp"><span className="demo-dot"/> Sample data</span>}
            {session&&<span className="msp">{session.mspName} · {session.email}</span>}
            {session&&<form action={signOutAction}><button type="submit" className="link-btn">Sign out</button></form>}
          </div>
        </header>
        <main id="main-content" className="console-main">{children}</main>
      </div>
    </div>
  </>;
}
