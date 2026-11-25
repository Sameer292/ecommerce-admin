import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { compressHtml } from "@/server/compression";
import { axiosFetch } from "@/lib/http";
import { withRequestDiagnostics } from "@/server/request-diagnostics.server";

const privateResponses = createMiddleware().server(({ next, request }) =>
	withRequestDiagnostics(request, async (requestId) => {
		setResponseHeaders(
			new Headers({
				"Cache-Control": "private, no-store",
				"X-Content-Type-Options": "nosniff",
				"X-Frame-Options": "DENY",
				"Referrer-Policy": "same-origin",
				"X-Request-Id": requestId,
			}),
		);
		const result = await next();
		return { ...result, response: compressHtml(request, result.response) };
	}),
);

export const startInstance = createStart(() => ({
	serverFns: { fetch: axiosFetch },
	requestMiddleware: [
		privateResponses,
		createCsrfMiddleware({
			filter: ({ handlerType }) => handlerType === "serverFn",
		}),
	],
}));
