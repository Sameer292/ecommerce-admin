import type { CustomFetch } from "@tanstack/react-start";
import axios, { type AxiosHeaders } from "axios";

// Keep Start's streaming serializer and error responses intact.
export const axiosFetch: CustomFetch = async (input, init) => {
	const request = new Request(
		input instanceof Request ? input : new URL(input, globalThis.location?.origin),
		init,
	);
	const response = await axios.request<ReadableStream<Uint8Array>>({
		url: request.url,
		method: request.method,
		headers: {
			...Object.fromEntries(request.headers),
			"Content-Type": request.headers.get("content-type") ?? false,
		},
		data: request.body,
		signal: request.signal,
		adapter: "fetch",
		responseType: "stream",
		withCredentials:
			request.credentials === "same-origin" ? undefined : request.credentials === "include",
		fetchOptions: { redirect: request.redirect },
		transformRequest: [(data) => data],
		transformResponse: [(data) => data],
		validateStatus: () => true,
	});
	return new Response(response.data, {
		status: response.status,
		statusText: response.statusText,
		headers: (response.headers as AxiosHeaders).toJSON(true),
	});
};
