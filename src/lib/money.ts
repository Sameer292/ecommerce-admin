import { currencyDigits } from "./format";

export const maxMinorAmount = 2_147_483_647;

export const parseMoneyInput = (value: string, currency: string) => {
	const match = /^(\d{1,12})(?:\.(\d+))?$/.exec(value);
	if (!match) return null;
	const digits = currencyDigits(currency);
	const [, whole, fraction = ""] = match;
	if (fraction.length > digits) return null;
	const minor = Number(whole) * 10 ** digits + Number(fraction.padEnd(digits, "0"));
	return minor <= maxMinorAmount ? minor : null;
};
