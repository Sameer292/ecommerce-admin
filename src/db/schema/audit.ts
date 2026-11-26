import { index, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { commerce } from "./namespace";

export const auditEvents = commerce.table(
	"audit_events",
	{
		id: uuid().primaryKey().defaultRandom(),
		actorId: text("actor_id"),
		subject: text().notNull(),
		recordId: text("record_id").notNull(),
		recordLabel: text("record_label").notNull(),
		action: text().notNull(),
		fields: text().array().notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index().on(table.createdAt, table.id)],
);
