import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";

const privateResponses = createMiddleware().server(({ next }) => {
	setResponseHeaders(
		new Headers({
			"Cache-Control": "private, no-store",
			"X-Content-Type-Options": "nosniff",
			"X-Frame-Options": "DENY",
			"Referrer-Policy": "same-origin",
		}),
	);
	return next();
});

export const startInstance = createStart(() => ({
	requestMiddleware: [
		privateResponses,
		createCsrfMiddleware({
			filter: ({ handlerType }) => handlerType === "serverFn",
		}),
	],
}));
