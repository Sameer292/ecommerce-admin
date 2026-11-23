import { z } from "zod";

export const timeZoneSchema = z
	.string()
	.trim()
	.max(100)
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
