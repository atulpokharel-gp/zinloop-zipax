"use server";

import { revalidatePath } from "next/cache";
import { createRecoveryLink, RecoveryError, type RecoveryLink } from "@/lib/mail-status.ts";
import { requireSuperadmin } from "@/lib/superadmin.ts";

export type RecoveryState = { error?: string; link?: RecoveryLink; email?: string };

export async function createRecoveryLinkAction(_prev: RecoveryState, form: FormData): Promise<RecoveryState> {
  const admin = await requireSuperadmin();
  const email = String(form.get("email") ?? "");
  try {
    const link = await createRecoveryLink(email);
    // Stamp a note in server logs so the rescue is traceable. Tenant audit log
    // records live under withTenant; keeping this out of there makes the
    // rescue path simple and easy to review.
    console.log(`[superadmin] ${admin.email} created password reset link for ${link.email}`);
    revalidatePath("/superadmin/mail");
    return { link, email: link.email };
  } catch (err) {
    if (err instanceof RecoveryError) return { error: err.message, email };
    console.error(`[superadmin] recovery link failed: ${(err as Error).message}`);
    return { error: "Couldn't create a rescue link. Try again.", email };
  }
}
