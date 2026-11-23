import { Logout01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/features/auth/auth-client";

const useSignOut = () => {
	const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
	const signOut = async () => {
		setStatus("pending");
		try {
			const result = await authClient.signOut();
			if (result.error) throw result.error;
			window.location.assign("/login");
		} catch {
			setStatus("error");
		}
	};
	return { status, signOut };
};

export const SignOut = () => {
	const { status, signOut } = useSignOut();
	return (
		<div className="flex flex-col gap-1">
			<Button
				variant="ghost"
				size="icon"
				aria-label="Sign out"
				onClick={signOut}
				disabled={status === "pending"}
			>
				<HugeiconsIcon icon={Logout01Icon} />
			</Button>
			{status === "error" && (
				<p role="alert" className="text-xs text-destructive">
					Sign-out failed.
				</p>
			)}
		</div>
	);
};
