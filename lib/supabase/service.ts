import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Server-only client that bypasses RLS with the service role key. Used
// exclusively by the public trip page, which has no signed-in user to
// scope RLS to — the unguessable share token in the URL is the credential
// instead, the same trust model as any other magic link. Never import
// this from a Client Component or expose the key to the browser.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
