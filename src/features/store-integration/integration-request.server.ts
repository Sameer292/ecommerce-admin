import type { ZodType } from "zod";
import { databaseCode } from "@/server/db-errors.server";
import { checkIntegrationToken } from "./integration-auth.server";

export class IntegrationError extends Error {
	readonly status: number;
	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

const maxBodySize = 64 * 1024;

const readBody = async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
	const decoder = new TextDecoder("utf-8", { fatal: true });
	let text = "";
	let bytes = 0;
	try {
		while (true) {
			const chunk = await reader.read();
			if (chunk.done) return text + decoder.decode();
			bytes += chunk.value.byteLength;
			if (bytes > maxBodySize) {
				await reader.cancel();
				throw new IntegrationError(413, "Request body is too large.");
			}
			text += decoder.decode(chunk.value, { stream: true });
		}
	} finally {
		reader.releaseLock();
	}
};

const readJson = async (request: Request): Promise<unknown> => {
	const type = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
	if (type !== "application/json") throw new IntegrationError(415, "Send application/json.");
	if (!request.body) throw new IntegrationError(400, "A JSON body is required.");
	try {
		return JSON.parse(await readBody(request.body.getReader()));
	} catch (error) {
		if (error instanceof IntegrationError) throw error;
		throw new IntegrationError(400, "Invalid JSON body.");
	}
};

export const integrationError = (error: unknown) => {
	if (error instanceof IntegrationError) {
		return Response.json({ error: error.message }, { status: error.status });
	}
	console.error("Store integration failed", { code: databaseCode(error) });
	return Response.json({ error: "Request could not be completed." }, { status: 500 });
};

export const withIntegrationBody = async <Input>(
	request: Request,
	schema: ZodType<Input>,
	handle: (data: Input) => Promise<Response>,
) => {
	const blocked = checkIntegrationToken(request);
	if (blocked) return blocked;
	try {
		const parsed = schema.safeParse(await readJson(request));
		if (!parsed.success)
			return Response.json(
				{ error: "Invalid request.", issues: parsed.error.issues },
				{ status: 400 },
			);
		return await handle(parsed.data);
	} catch (error) {
		return integrationError(error);
	}
};
