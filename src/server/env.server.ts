import { z } from "zod";
import {
	currencySchema,
	timeZoneSchema,
} from "@/features/settings/store-validation";

const schema = z.object({
	DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
	BETTER_AUTH_URL: z.url({ protocol: /^https?$/ }),
	BETTER_AUTH_SECRET: z.string().min(32),
	AUTH_CLIENT_IP_HEADER: z
		.string()
		.regex(/^[a-zA-Z0-9-]+$/)
		.optional(),
	STORE_NAME: z.string().trim().min(1).max(80).default("Commerce"),
	STORE_CURRENCY: currencySchema.default("USD"),
	STORE_TIME_ZONE: timeZoneSchema.default("UTC"),
});

export const env = schema.parse(process.env);
