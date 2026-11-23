import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "@/server/env.server";

export const sha256 = (value: string) => createHash("sha256").update(value).digest();

export const checkIntegrationToken = (request: Request) => {
	const token = env.STORE_INTEGRATION_TOKEN;
	if (!token) return new Response(null, { status: 404 });
	const match = /^Bearer ([A-Za-z0-9._-]{32,128})$/i.exec(
		request.headers.get("authorization") ?? "",
	);
	if (!match || !timingSafeEqual(sha256(token), sha256(match[1]))) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}
};
