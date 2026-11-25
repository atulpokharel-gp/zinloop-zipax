// Mail delivery visibility. Backs the superadmin Mail panel and the per-tenant
// Settings warning. Also lets a superadmin mint a one-time password reset link
// for a locked-out customer so they can be rescued even when SMTP is off.

import { getPool, withTenant } from "./db.ts";
import { newToken, tokenHash } from "./secrets.ts";

/** Minutes a rescue reset link is good for. The default matches /forgot. */
export const RESCUE_RESET_MINUTES = 60;

const num = (v: unknown) => Number(v ?? 0);
const date = (v: unknown): Date | null => (v instanceof Date ? v : v ? new Date(v as string) : null);

export interface MailDeliveryStatus {
  /** True when both SMTP_URL and MAIL_FROM are set. */
  configured: boolean;
  pending: number;
  failed: number;
  sent24h: number;
  oldestPendingAt: Date | null;
  byKind: { alert: number; weekly: number; invite: number; reset: number };
  lastOkAt: Date | null;
  lastErrorAt: Date | null;
  lastError: string | null;
}

/** True only when both envs are set. Mirrors app/api/cron/mail/route.ts. */
export function mailConfigured(): boolean {
  return Boolean(process.env.SMTP_URL && process.env.MAIL_FROM);
}

export async function mailStatus(): Promise<MailDeliveryStatus> {
  const row =
    (await getPool().query("select * from superadmin_mail_status()")).rows[0] ?? {};
  return {
    configured: mailConfigured(),
    pending: num(row.pending),
    failed: num(row.failed),
    sent24h: num(row.sent_24h),
    oldestPendingAt: date(row.oldest_pending_at),
    byKind: {
      alert: num(row.pending_alert),
      weekly: num(row.pending_weekly),
      invite: num(row.pending_invite),
      reset: num(row.pending_reset),
    },
    lastOkAt: date(row.mail_last_ok_at),
    lastErrorAt: date(row.mail_last_err_at),
    lastError: row.mail_last_error ? String(row.mail_last_error) : null,
  };
}

export interface OutboxRow {
  id: string;
  kind: "alert" | "weekly" | "invite" | "reset";
  toEmail: string;
  subject: string;
  attempts: number;
  lastError: string | null;
  createdAt: Date;
  nextTryAt: Date;
  mspId: string;
  mspName: string;
}

export async function recentOutbox(limit = 50): Promise<OutboxRow[]> {
  const rows = (await getPool().query("select * from superadmin_outbox_recent($1)", [limit])).rows;
  return rows.map((r) => ({
    id: String(r.id),
    kind: r.kind,
    toEmail: r.to_email,
    subject: r.subject,
    attempts: num(r.attempts),
    lastError: r.last_error ? String(r.last_error) : null,
    createdAt: new Date(r.created_at),
    nextTryAt: new Date(r.next_try_at),
    mspId: r.msp_id,
    mspName: r.msp_name,
  }));
}

export class RecoveryError extends Error {}

export interface RecoveryLink {
  email: string;
  mspName: string;
  userName: string | null;
  url: string;
  expiresAt: Date;
  expiresMinutes: number;
}

/**
 * Mints a one-time password reset link for a user, bypassing the outbox so a
 * superadmin can deliver it by hand. The caller shows the url once and never
 * stores it: only the hash of the token is kept in the database. Supersedes
 * any earlier reset for that user. Throws RecoveryError with a human-readable
 * message when the email is unknown or CONSOLE_URL isn't set.
 */
export async function createRecoveryLink(email: string): Promise<RecoveryLink> {
  const addr = (email ?? "").trim().toLowerCase();
  if (!addr || addr.length > 320 || !addr.includes("@")) {
    throw new RecoveryError("Enter a valid email address.");
  }
  const base = process.env.CONSOLE_URL?.trim().replace(/\/+$/, "");
  if (!base) throw new RecoveryError("CONSOLE_URL isn't set on this server.");
  const user =
    (await getPool().query<{ user_id: string; msp_id: string; email: string; msp_name: string; name: string | null }>(
      "select * from superadmin_user_by_email($1)",
      [addr],
    )).rows[0];
  if (!user) throw new RecoveryError(`No Zinloop account uses ${addr}.`);
  const token = newToken("zlp");
  const row = (
    await getPool().query<{ expires_at: string | Date }>(
      "select expires_at from superadmin_create_reset($1, $2, $3, $4)",
      [user.user_id, user.msp_id, tokenHash(token), RESCUE_RESET_MINUTES],
    )
  ).rows[0];
  return {
    email: user.email,
    mspName: user.msp_name,
    userName: user.name,
    url: `${base}/reset/${token}`,
    expiresAt: new Date(row.expires_at),
    expiresMinutes: RESCUE_RESET_MINUTES,
  };
}

export interface TenantMailStatus {
  /** True when both SMTP_URL and MAIL_FROM are set on the server. */
  configured: boolean;
  /** Outbox rows for this MSP still waiting to send. */
  pending: number;
  /** How many of the pending rows have had at least one send error. */
  failedPending: number;
  /** The newest error message across this MSP's pending rows, if any. */
  lastError: string | null;
  /** When the oldest pending row for this MSP was created. */
  oldestPendingAt: Date | null;
}

/** Per-tenant snapshot for the Settings warning. Safe on an app-role pool. */
export async function tenantMailStatus(mspId: string): Promise<TenantMailStatus> {
  const row = await withTenant(mspId, async (db) => {
    return (
      await db.query<{
        pending: string;
        failed_pending: string;
        oldest_pending_at: Date | null;
        last_error: string | null;
      }>(
        `select
           count(*) filter (where sent_at is null) as pending,
           count(*) filter (where sent_at is null and coalesce(last_error, '') <> '') as failed_pending,
           min(created_at) filter (where sent_at is null) as oldest_pending_at,
           (
             select last_error from outbox
             where sent_at is null and coalesce(last_error, '') <> ''
             order by created_at desc limit 1
           ) as last_error
         from outbox`,
      )
    ).rows[0];
  });
  return {
    configured: mailConfigured(),
    pending: num(row?.pending),
    failedPending: num(row?.failed_pending),
    lastError: row?.last_error ?? null,
    oldestPendingAt: row?.oldest_pending_at ?? null,
  };
}
