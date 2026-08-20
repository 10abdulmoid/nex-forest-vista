import { createClient } from "@supabase/supabase-js";

function supabaseUrl() {
  const remote = String(import.meta.env.VITE_SUPABASE_URL ?? "").trim();
  if (!remote) {
    throw new Error("VITE_SUPABASE_URL must be set");
  }
  if (import.meta.env.DEV && typeof window !== "undefined") {
    return `${window.location.origin}/sb`;
  }
  return remote;
}

const anon = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();
if (!anon) {
  throw new Error("VITE_SUPABASE_ANON_KEY must be set");
}

const browser = typeof window !== "undefined";

export const supabase = createClient(supabaseUrl(), anon, {
  auth: {
    persistSession: browser,
    autoRefreshToken: browser,
    detectSessionInUrl: browser,
  },
});
