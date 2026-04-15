"use server";

import { acceptInvitation } from "@/lib/invitations/service";
import { acceptInvitationSchema } from "@/lib/validations/team-members";

type ActionResult =
  | { success: true; email: string }
  | { success: false; error: string };

export async function acceptInvitationAction(input: {
  token: string;
  password: string;
  confirm: string;
}): Promise<ActionResult> {
  const parsed = acceptInvitationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  return acceptInvitation({
    rawToken: parsed.data.token,
    password: parsed.data.password,
  });
}
