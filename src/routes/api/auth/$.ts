import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/features/auth/auth.server";

const publicAuthPaths = new Set([
	"GET /api/auth/get-session",
	"POST /api/auth/sign-in/email",
	"POST /api/auth/sign-out",
	"POST /api/auth/change-password",
]);

const handleAuth = ({ request }: { request: Request }) =>
	publicAuthPaths.has(`${request.method} ${new URL(request.url).pathname}`)
		? auth.handler(request)
		: new Response(null, { status: 404 });

export const Route = createFileRoute("/api/auth/$")({
	server: { handlers: { GET: handleAuth, POST: handleAuth } },
});
