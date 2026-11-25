import { sql } from "drizzle-orm";
import { db } from "./client.server";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const setAuditActor = (transaction: Transaction, staffId: string | undefined) =>
	transaction.execute(sql`select set_config('commerce_admin.actor_id', ${staffId ?? ""}, true)`);

export const inStaffAudit = <Result>(
	staffId: string | undefined,
	operation: (transaction: Transaction) => Promise<Result>,
) =>
	db.transaction(async (transaction) => {
		await setAuditActor(transaction, staffId);
		return operation(transaction);
	});
