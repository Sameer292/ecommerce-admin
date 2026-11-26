export const loginReturn = (value: unknown): string | undefined => {
	const base = "https://admin.invalid";
	if (typeof value !== "string" || !value.startsWith("/") || !URL.canParse(value, base)) {
		return undefined;
	}
	const url = new URL(value, base);
	if (url.origin !== base || url.pathname.startsWith("//")) return undefined;
	if (url.pathname === "/password/set") return "/password/set";
	const adminPath =
		/^\/(?:products|categories|orders|customers|inventory|team|settings|integrations|audit)(?:\/|$)/;
	if (url.pathname !== "/" && !adminPath.test(url.pathname)) return undefined;
	return url.pathname + url.search + url.hash;
};
