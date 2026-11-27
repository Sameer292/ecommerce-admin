export const loginReturn = (value: unknown): string | undefined => {
	const base = "https://admin.invalid";
	if (typeof value !== "string" || !value.startsWith("/") || !URL.canParse(value, base)) {
		return undefined;
	}
	const url = new URL(value, base);
	if (url.origin !== base || url.pathname.startsWith("//")) return undefined;
	if (url.pathname === "/password/set") return "/password/set";
	const adminPath =
		/^\/(?:dashboard|products|product-import|categories|orders|customers|inventory|team|settings|integrations|audit)(?:\/|$)/;
	const pathname = url.pathname === "/" ? "/dashboard" : url.pathname;
	if (!adminPath.test(pathname)) return undefined;
	return pathname + url.search + url.hash;
};
