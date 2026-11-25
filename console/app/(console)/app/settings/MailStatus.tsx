import { tenantMailStatus } from "@/lib/mail-status.ts";

/**
 * Shown on Settings only when something is actually wrong with email delivery
 * for this tenant: either SMTP isn't configured and the owner has queued mail
 * waiting, or a recent send error landed on one of their rows. Silent when
 * the outbox is clean.
 */
export async function MailStatus({ mspId, isOwner }: { mspId: string; isOwner: boolean }) {
  if (!isOwner) return null;
  let s;
  try {
    s = await tenantMailStatus(mspId);
  } catch {
    return null; // Never fail the Settings page because of a status read.
  }
  if (s.pending === 0 && !s.lastError) return null;

  const title = !s.configured
    ? "Email delivery isn't set up on this server."
    : s.lastError
      ? "Email delivery is failing."
      : "Mail is queued to go out.";
  const detail = !s.configured
    ? `${s.pending} email${s.pending === 1 ? "" : "s"} in your outbox — invites, password resets and alerts aren't being delivered. Contact support@zinloop.com and we'll turn mail on.`
    : s.lastError
      ? `Last error: ${s.lastError}. ${s.pending} email${s.pending === 1 ? "" : "s"} waiting.`
      : `${s.pending} email${s.pending === 1 ? "" : "s"} in the outbox. The sender runs every few minutes.`;
  return (
    <section className="warning" role="alert">
      <h2>{title}</h2>
      <p>{detail}</p>
    </section>
  );
}
