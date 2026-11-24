import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getCookies, getRequest, getRequestUrl, setCookie } from "@tanstack/react-start/server";
import { env } from "@/server/env.server";

const createRequestAuth = () => {
	const currentCookies = new Map(Object.entries(getCookies()));
	return createServerClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
		cookieOptions: {
			name: "commerce-admin-auth",
			httpOnly: true,
			sameSite: "lax",
			secure: process.env.NODE_ENV === "production" || getRequestUrl().protocol === "https:",
		},
		cookies: {
			getAll: () => Array.from(currentCookies, ([name, value]) => ({ name, value })),
			setAll: (cookies) => {
				for (const { name, value, options } of cookies) {
					setCookie(name, value, options);
					// Rejected sign-ins clear cookies issued earlier in the same request.
					if (options.maxAge === 0) currentCookies.delete(name);
					else currentCookies.set(name, value);
				}
			},
		},
	}).auth;
};

const requestAuth = new WeakMap<Request, ReturnType<typeof createRequestAuth>>();

export const getSupabaseAuth = () => {
	const request = getRequest();
	const cached = requestAuth.get(request);
	if (cached) return cached;
	const auth = createRequestAuth();
	requestAuth.set(request, auth);
	return auth;
};

export const verifyCurrentPassword = async (id: string, email: string, password: string) => {
	const { auth } = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
		auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
	});
	const { data, error } = await auth.signInWithPassword({ email, password });
	if (error || !data.user) return false;
	await auth.signOut({ scope: "local" });
	return data.user.id === id;
};
