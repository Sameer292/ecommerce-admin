export const formatCount = (amount: number) => new Intl.NumberFormat("en-US").format(amount);

export const formatDate = (date: Date, timeZone: string) =>
	new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone }).format(date);

const currencyFormatter = (currency: string) =>
	new Intl.NumberFormat("en-US", { style: "currency", currency });

export const currencyDigits = (currency: string) =>
	currencyFormatter(currency).resolvedOptions().maximumFractionDigits ?? 2;

export const formatMoney = (minor: number, currency: string) =>
	currencyFormatter(currency).format(minor / 10 ** currencyDigits(currency));

export const moneyInput = (minor: number, currency: string) => {
	const digits = currencyDigits(currency);
	return (minor / 10 ** digits).toFixed(digits);
};
