import {
	dehydrate,
	hydrate,
	QueryClientProvider,
	type DehydratedState,
} from "@tanstack/react-query";
import { createRouter, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { createQueryClient } from "./lib/query-client";
import { routeTree } from "./routeTree.gen";

const QueryProvider = ({ children }: { children: ReactNode }) => {
	const { queryClient } = useRouter().options.context;
	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

export const getRouter = () => {
	const queryClient = createQueryClient();
	return createRouter({
		routeTree,
		context: { queryClient },
		InnerWrap: QueryProvider,
		dehydrate: () => ({ queryState: dehydrate(queryClient) }),
		hydrate: ({ queryState }) => hydrate(queryClient, queryState),
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
		defaultStaleReloadMode: "blocking",
	});
};

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
	interface SerializableExtensions {
		queryState: DehydratedState;
	}
}
