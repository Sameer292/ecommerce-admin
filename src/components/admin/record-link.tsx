import { Link, useLocation, type LinkComponentProps } from "@tanstack/react-router";
import { listReturnHref, listReturnSearchSchema } from "@/lib/list-return";

export const RecordLink = (props: LinkComponentProps<"a">) => {
	const href = useLocation({ select: (location) => location.href });
	return <Link {...props} search={listReturnSearchSchema.parse({ returnTo: href })} />;
};

export const useListReturn = (fallback: string) =>
	useLocation({ select: (location) => listReturnHref(location.search.returnTo, fallback) });
