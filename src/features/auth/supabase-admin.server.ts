import { createClient } from "@supabase/supabase-js";
import { env } from "@/server/env.server";

export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
	auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
}).auth.admin;
