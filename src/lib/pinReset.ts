import { supabase } from "@/integrations/supabase/client";

/**
 * Where the emailed link lands. Deliberately unlisted: nothing in the app
 * links here and it is not in the sitemap. The address is not what keeps
 * it safe, though. The server only accepts a new PIN from a session that
 * was opened from the email, minutes after the request.
 */
export const PIN_RESET_PATH = "/k/r7q2-unlock";

/** Note the request, then have Supabase email the account a sign-in link. */
export async function requestPinReset(): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "This account has no email address to send the link to." };

  const { error: rpcError } = await (supabase.rpc as any)("request_pin_reset");
  if (rpcError) return { ok: false, error: rpcError.message };

  const { error } = await supabase.auth.signInWithOtp({
    email: user.email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${window.location.origin}${PIN_RESET_PATH}`,
    },
  });
  if (error) {
    const wait = /security purposes|rate limit|seconds/i.test(error.message);
    return { ok: false, error: wait ? "An email was just sent. Wait a minute before asking for another." : error.message };
  }
  return { ok: true, email: user.email };
}

/** Hides most of the address: "fi•••@gmail.com". */
export function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  return `${name.slice(0, 2)}•••@${domain}`;
}
