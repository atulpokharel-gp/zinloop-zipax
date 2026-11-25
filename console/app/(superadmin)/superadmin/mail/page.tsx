import type { Metadata } from "next";
import Link from "next/link";
import { mailStatus, recentOutbox } from "@/lib/mail-status.ts";
import { requireSuperadmin } from "@/lib/superadmin.ts";
import { RecoveryForm } from "./RecoveryForm.tsx";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mail · Super admin" };

const fmtWhen = (d: Date | null) =>
  d ? d.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
const fmtAgo = (d: Date | null) => {
  if (!d) return "—";
  const sec = Math.round((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.round(sec / 3600)}h ago`;
  return `${Math.round(sec / 86400)}d ago`;
};

export default async function SuperadminMail() {
  await requireSuperadmin();
  const [status, pending] = await Promise.all([mailStatus(), recentOutbox(50)]);

  return (
    <>
      <nav className="sa-nav"><Link href="/superadmin">← Overview</Link></nav>
      <h1>Email delivery</h1>
      <p className="sub">Across every tenant. Also lets you mint a one-time password reset link when a customer is locked out and email isn't sending.</p>

      {!status.configured && (
        <div className="sa-warn" role="alert">
          <b>SMTP isn't configured.</b> No email has gone out — not invites, not password resets, not alerts.
          Set <code>SMTP_URL</code> and <code>MAIL_FROM</code> in Vercel, redeploy, and the cron will drain the outbox on the next 5-minute tick.
          Until then, use the rescue form below to unblock any locked-out customer.
        </div>
      )}
      {status.configured && status.lastErrorAt && (!status.lastOkAt || status.lastErrorAt > status.lastOkAt) && (
        <div className="sa-warn" role="alert">
          <b>Mail delivery is failing.</b> Last error at {fmtWhen(status.lastErrorAt)}: <code>{status.lastError ?? "(no message)"}</code>
        </div>
      )}

      <div className="sa-tiles">
        <div className="sa-tile"><b>{status.pending.toLocaleString()}</b><span>Pending in outbox</span><div className="delta">Oldest {fmtAgo(status.oldestPendingAt)}</div></div>
        <div className="sa-tile"><b>{status.failed.toLocaleString()}</b><span>Pending with retries</span></div>
        <div className="sa-tile"><b>{status.sent24h.toLocaleString()}</b><span>Delivered in 24 h</span></div>
        <div className="sa-tile">
          <b style={{ color: status.configured ? "var(--lime)" : "var(--high)" }}>{status.configured ? "ON" : "OFF"}</b>
          <span>SMTP configured</span>
          <div className="delta">Cron ok: {fmtAgo(status.lastOkAt)}</div>
        </div>
      </div>

      <h2>Pending by kind</h2>
      <div className="sa-card">
        <table>
          <thead><tr><th>Kind</th><th className="num">Pending</th><th>What it affects</th></tr></thead>
          <tbody>
            <tr><td>Password reset</td><td className="num">{status.byKind.reset}</td><td className="muted">Locked-out customers waiting for a reset link</td></tr>
            <tr><td>Team / viewer invite</td><td className="num">{status.byKind.invite}</td><td className="muted">Pending invite emails</td></tr>
            <tr><td>Risk alert</td><td className="num">{status.byKind.alert}</td><td className="muted">New high-risk AI tool / returned risk</td></tr>
            <tr><td>Weekly summary</td><td className="num">{status.byKind.weekly}</td><td className="muted">Monday MSP + client digests</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Rescue a locked-out customer</h2>
      <div className="sa-card sa-rescue-wrap">
        <p className="muted" style={{ padding: "12px 16px 0" }}>
          Enter the customer's account email. We'll create a one-time password reset link you can send them directly — email delivery isn't used.
          The link works for {60} minutes and invalidates any earlier reset link for that user.
        </p>
        <div style={{ padding: "4px 16px 16px" }}>
          <RecoveryForm />
        </div>
      </div>

      <h2>Oldest pending mail ({pending.length})</h2>
      <div className="sa-card">
        <table>
          <thead>
            <tr><th>Kind</th><th>To</th><th>Company</th><th>Subject</th><th className="num">Tries</th><th>Last error</th><th>Queued</th></tr>
          </thead>
          <tbody>
            {pending.length === 0 && <tr><td colSpan={7} className="muted">Outbox is empty.</td></tr>}
            {pending.map((r) => (
              <tr key={r.id}>
                <td><span className="pill">{r.kind}</span></td>
                <td>{r.toEmail}</td>
                <td>{r.mspName}</td>
                <td className="muted" style={{ maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.subject}</td>
                <td className="num">{r.attempts}</td>
                <td className="muted" style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.lastError ?? "—"}</td>
                <td className="muted">{fmtAgo(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
