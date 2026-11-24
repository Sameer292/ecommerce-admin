import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { compressHtml } from "@/server/compression";

const privateResponses = createMiddleware().server(async ({ next, request }) => {
	setResponseHeaders(
		new Headers({
			"Cache-Control": "private, no-store",
			"X-Content-Type-Options": "nosniff",
			"X-Frame-Options": "DENY",
			"Referrer-Policy": "same-origin",
		}),
	);
	const result = await next();
	return { ...result, response: compressHtml(request, result.response) };
});

export const startInstance = createStart(() => ({
	requestMiddleware: [
		privateResponses,
		createCsrfMiddleware({
			filter: ({ handlerType }) => handlerType === "serverFn",
		}),
	],
}));
