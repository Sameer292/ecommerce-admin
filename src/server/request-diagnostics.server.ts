import { AsyncLocalStorage } from "node:async_hooks";
import { databaseCode } from "./db-errors.server";

const requests = new AsyncLocalStorage<{ requestId: string; method: string }>();

export const withRequestDiagnostics = <Result>(
	request: Request,
	handle: (requestId: string) => Result,
) => {
	const requestId = crypto.randomUUID();
	return requests.run({ requestId, method: request.method }, () => handle(requestId));
};

export const logRequestFailure = (operation: string, error: unknown) => {
	const request = requests.getStore();
	const code = databaseCode(error);
	console.error("Request failed", {
		...request,
		operation,
		code: typeof code === "string" && /^[A-Z0-9_]{1,32}$/.test(code) ? code : undefined,
	});
	return request?.requestId;
};
