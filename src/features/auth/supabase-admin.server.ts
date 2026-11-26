import { createClient } from "@supabase/supabase-js";
import { env } from "@/server/env.server";

const service = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
	auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

export const supabaseAdmin = service.auth.admin;
export const supabaseStorage = service.storage;
