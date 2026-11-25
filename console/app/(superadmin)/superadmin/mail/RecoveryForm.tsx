"use client";

import { useActionState } from "react";
import { createRecoveryLinkAction, type RecoveryState } from "./actions.ts";

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function RecoveryForm() {
  const [state, action, pending] = useActionState<RecoveryState, FormData>(createRecoveryLinkAction, {});
  return (
    <div>
      <form action={action} className="sa-rescue">
        <label>
          <span>Customer email</span>
          <input name="email" type="email" required autoComplete="off" defaultValue={state.link ? "" : state.email ?? ""} />
        </label>
        <button type="submit" className="sa-btn" disabled={pending}>{pending ? "Creating…" : "Create reset link"}</button>
      </form>
      {state.error && <div className="sa-error" role="alert">{state.error}</div>}
      {state.link && (
        <div className="sa-rescue-out" role="status">
          <p>
            Reset link for <b>{state.link.email}</b>
            {state.link.userName ? ` (${state.link.userName})` : ""} at <b>{state.link.mspName}</b>.
            It works once and expires at <b>{fmtWhen(state.link.expiresAt.toString())}</b>.
          </p>
          <code className="sa-rescue-link">{state.link.url}</code>
          <p className="muted">Send this to the customer directly — it won't be emailed. Any earlier reset link for them has been invalidated.</p>
        </div>
      )}
    </div>
  );
}
