import { Duplex } from "node:stream";
import { constants, createGzip } from "node:zlib";

export const compressHtml = (request: Request, response: Response) => {
	if (
		request.method === "HEAD" ||
		response.status !== 200 ||
		!response.body ||
		!response.headers.get("Content-Type")?.toLowerCase().startsWith("text/html") ||
		response.headers.has("Content-Encoding") ||
		response.headers.has("Content-Range") ||
		/\bno-transform\b/i.test(response.headers.get("Cache-Control") ?? "")
	) {
		return response;
	}

	const headers = new Headers(response.headers);
	if (
		!headers
			.get("Vary")
			?.split(",")
			.some((value) => /^(accept-encoding|\*)$/i.test(value.trim()))
	) {
		headers.append("Vary", "Accept-Encoding");
	}
	const encodings = new Map(
		(request.headers.get("Accept-Encoding") ?? "")
			.toLowerCase()
			.split(",")
			.map((value) => {
				const [encoding, ...parameters] = value.trim().split(";");
				const quality = parameters.find((parameter) => parameter.trim().startsWith("q="));
				return [encoding.trim(), quality ? Number(quality.trim().slice(2)) : 1];
			}),
	);
	const quality = encodings.get("gzip") ?? encodings.get("*") ?? 0;
	if (!(quality > 0 && quality <= 1) || quality < (encodings.get("identity") ?? 0)) {
		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers,
		});
	}

	headers.set("Content-Encoding", "gzip");
	headers.delete("Content-Length");
	headers.delete("ETag");
	const body = response.body.pipeThrough(
		Duplex.toWeb(createGzip({ flush: constants.Z_SYNC_FLUSH })) as ReadableWritablePair<
			Uint8Array,
			Uint8Array
		>,
	);
	return new Response(body, { status: response.status, statusText: response.statusText, headers });
};
