import { z } from "zod";

export const timeZoneSchema = z
	.string()
	.trim()
	.max(100)
	.regex(/^[A-Za-z][A-Za-z0-9_+/-]*$/, "Enter a named IANA time zone.")
	.refine((value) => {
		try {
			new Intl.DateTimeFormat("en", { timeZone: value });
			return true;
		} catch {
			return false;
		}
	}, "Enter a valid time zone, such as America/New_York.");

const supportedCurrencies = Intl.supportedValuesOf("currency");
export const currencySchema = z
	.string()
	.refine((value) => supportedCurrencies.includes(value), "Enter a supported ISO currency code.");

export const storeSettingsSchema = z.object({
	name: z.string().trim().min(1, "Enter a store name.").max(80),
	contactEmail: z.union([z.literal(""), z.email()]),
	timeZone: timeZoneSchema,
});
