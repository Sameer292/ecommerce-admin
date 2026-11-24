import { z } from "zod";
import { currencySchema, timeZoneSchema } from "@/features/settings/store-validation";

const schema = z.object({
	DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
	SUPABASE_URL: z.url({ protocol: /^https?$/ }),
	SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1),
	SUPABASE_SECRET_KEY: z.string().trim().min(1),
	STORE_INTEGRATION_TOKEN: z
		.string()
		.min(32)
		.max(128)
		.regex(/^[A-Za-z0-9._-]+$/)
		.optional(),
	STORE_NAME: z.string().trim().min(1).max(80).default("Commerce"),
	STORE_CURRENCY: currencySchema.default("USD"),
	STORE_TIME_ZONE: timeZoneSchema.default("UTC"),
});

export const env = schema.parse(process.env);
