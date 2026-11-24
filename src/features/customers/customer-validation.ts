import { z } from "zod";
import { pageSearchSchema } from "@/lib/pagination";
import { sortSchema } from "@/lib/sort";
import { optionalId } from "@/lib/validation";

export const customerFormSchema = z.object({
	id: optionalId,
	name: z.string().trim().min(1, "Enter a customer name.").max(120),
	email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
	phone: z.string().trim().max(40),
	notes: z.string().trim().max(2_000),
});

export const customerSearchSchema = pageSearchSchema.extend({
	sort: sortSchema("name", "email", "date", "purchases"),
});
