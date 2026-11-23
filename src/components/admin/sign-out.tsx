import { Logout01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/features/auth/auth-client";

export const SignOut = () => {
	const [error, setError] = useState(false);
	const [pending, setPending] = useState(false);
	const signOut = async () => {
		setPending(true);
		try {
			const result = await authClient.signOut();
			if (result.error) throw result.error;
			window.location.assign("/login");
		} catch {
			setError(true);
			setPending(false);
		}
	};
	return (
		<div className="flex flex-col gap-1">
			<Button
				variant="ghost"
				size="icon"
				aria-label="Sign out"
				onClick={signOut}
				disabled={pending}
			>
				<HugeiconsIcon icon={Logout01Icon} />
			</Button>
			{error && (
				<p role="alert" className="text-xs text-destructive">
					Sign-out failed.
				</p>
			)}
		</div>
	);
};
