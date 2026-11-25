import { sql } from "drizzle-orm";
import { db } from "@/db/client.server";
import { logRequestFailure } from "./request-diagnostics.server";

export const readHealth = async () => {
	try {
		await db.execute(sql`select 1`);
		return Response.json({ status: "ready" });
	} catch (error) {
		const requestId = logRequestFailure("database readiness", error);
		return Response.json({ status: "unavailable", requestId }, { status: 503 });
	}
};
