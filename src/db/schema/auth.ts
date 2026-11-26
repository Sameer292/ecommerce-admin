import { boolean, integer, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";
import { commerce } from "./namespace";

export const user = commerce.table("staff_user", {
	id: text().primaryKey(),
	authUserId: uuid("auth_user_id")
		.unique()
		.references(() => authUsers.id, { onDelete: "set null" }),
	name: text().notNull(),
	email: text().notNull().unique(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	role: text().default("viewer").notNull(),
	version: integer().notNull().default(0),
	banned: boolean().default(false),
	banReason: text("ban_reason"),
	banExpires: timestamp("ban_expires", { withTimezone: true }),
});
