import {
	HeadContent,
	Link,
	Scripts,
	createRootRoute,
	type ErrorComponentProps,
} from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import appCss from "../styles.css?url";

const RootDocument = ({ children }: { children: ReactNode }) => (
	<html lang="en" suppressHydrationWarning>
		<head>
			<HeadContent />
		</head>
		<body>
			<ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange>
				{children}
			</ThemeProvider>
			<Scripts />
		</body>
	</html>
);

const NotFound = () => (
	<main className="mx-auto flex max-w-lg flex-col gap-4 px-6 py-16">
		<h1 className="font-heading text-3xl font-semibold">Page not found</h1>
		<Link to="/" className="text-primary underline underline-offset-4">
			Back to overview
		</Link>
	</main>
);

const RouteError = ({ reset }: ErrorComponentProps) => (
	<main className="mx-auto flex max-w-lg flex-col items-start gap-4 px-6 py-16">
		<h1 className="font-heading text-3xl font-semibold">Page unavailable</h1>
		<p className="text-muted-foreground">The workspace couldn’t load this page.</p>
		<Button variant="outline" onClick={reset}>
			Try again
		</Button>
		<Link to="/" className="text-primary underline underline-offset-4">
			Back to overview
		</Link>
	</main>
);

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ name: "robots", content: "noindex, nofollow" },
			{ title: "Store admin" },
		],
		links: [{ rel: "stylesheet", href: appCss }],
	}),
	notFoundComponent: NotFound,
	errorComponent: RouteError,
	shellComponent: RootDocument,
});
