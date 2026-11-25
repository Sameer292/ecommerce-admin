import {
	email as ZEmail,
	literal as ZLiteral,
	object as ZObject,
	string as ZString,
	uuid as ZUuid,
} from "zod";
import { pageSearchSchema } from "@/lib/pagination";
import { sortSchema } from "@/lib/sort";
import { editVersionSchema, optionalId } from "@/lib/validation";

export const customerFormSchema = ZObject({
	id: optionalId,
	version: editVersionSchema.optional(),
	name: ZString().trim().min(1, "Enter a customer name.").max(120),
	email: ZString().trim().toLowerCase().max(254).pipe(ZEmail()),
	phone: ZString().trim().max(40),
	notes: ZString().trim().max(2_000),
});

export const customerSearchSchema = pageSearchSchema.extend({
	sort: sortSchema("name", "email", "date", "purchases"),
});

export const mergeCustomerSchema = ZObject({
	id: ZUuid(),
	version: editVersionSchema,
	targetEmail: ZString().trim().toLowerCase().max(254).pipe(ZEmail()),
	reason: ZString().trim().min(1, "Enter a reason for the merge.").max(500),
	confirm: ZLiteral("on", { error: "Confirm which customer profile will be kept." }),
});
