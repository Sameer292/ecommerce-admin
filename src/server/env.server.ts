import { enum as ZEnum, object as ZObject, string as ZString, url as ZUrl } from "zod";
import { currencySchema, timeZoneSchema } from "@/features/settings/store-validation";

const schema = ZObject({
	DATABASE_URL: ZUrl({ protocol: /^postgres(ql)?$/ }),
	SUPABASE_URL: ZUrl({ protocol: /^https?$/ }),
	SUPABASE_PUBLISHABLE_KEY: ZString().trim().min(1),
	SUPABASE_SECRET_KEY: ZString().trim().min(1),
	STORE_INTEGRATION_TOKEN: ZString()
		.min(32)
		.max(128)
		.regex(/^[A-Za-z0-9._-]+$/)
		.optional(),
	STORE_NAME: ZString().trim().min(1).max(80).default("Commerce"),
	STORE_INVENTORY_AUTHORITY: ZEnum(["admin", "unverified"]).default("unverified"),
	STORE_CURRENCY: currencySchema.default("USD"),
	STORE_TIME_ZONE: timeZoneSchema.default("UTC"),
});

export const env = schema.parse(process.env);
