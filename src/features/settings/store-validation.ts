import {
	email as ZEmail,
	literal as ZLiteral,
	object as ZObject,
	string as ZString,
	union as ZUnion,
} from "zod";

export const timeZoneSchema = ZString()
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
export const currencySchema = ZString().refine(
	(value) => supportedCurrencies.includes(value),
	"Enter a supported ISO currency code.",
);

export const storeSettingsSchema = ZObject({
	name: ZString().trim().min(1, "Enter a store name.").max(80),
	contactEmail: ZUnion([ZLiteral(""), ZEmail()]),
	timeZone: timeZoneSchema,
});
