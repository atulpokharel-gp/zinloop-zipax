"use client";

import { useActionState } from "react";
import { forgotAction, type ForgotState } from "./actions.ts";

export function ForgotForm() {
  const [state, action, pending] = useActionState<ForgotState, FormData>(forgotAction, {});
  if (state.done) {
    return (
      <div className="zok" role="status">
        <p>
          If an account exists for <b>{state.email}</b>, we&apos;ve started a password reset. The link expires in an hour. Check your spam folder if it doesn&apos;t arrive.
        </p>
        <p className="small">
          Still locked out after a few minutes? Email <a href="mailto:support@zinloop.com">support@zinloop.com</a> from the same address and we&apos;ll send the link by hand.
        </p>
      </div>
    );
  }
  return (
    <form action={action} className="zform">
      <div className="zfield full">
        <label htmlFor="email">Work email</label>
        <input id="email" name="email" type="email" autoComplete="username" required defaultValue={state.email} />
      </div>
      <button type="submit" className="zbtn zbtn-main" disabled={pending}>{pending ? "Sending…" : "Email me a reset link"}</button>
    </form>
  );
}
