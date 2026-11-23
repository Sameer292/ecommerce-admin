import { useHydrated } from "@tanstack/react-router";
import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export const ThemeToggle = () => {
	const { resolvedTheme, setTheme } = useTheme();
	const hydrated = useHydrated();
	return (
		<Button
			type="button"
			size="icon-lg"
			variant="ghost"
			aria-label="Toggle color theme"
			disabled={!hydrated}
			onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
		>
			<HugeiconsIcon icon={Moon02Icon} className="dark:hidden" />
			<HugeiconsIcon icon={Sun03Icon} className="hidden dark:block" />
		</Button>
	);
};
