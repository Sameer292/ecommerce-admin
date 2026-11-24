import { Logout01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { signOutStaff } from "@/features/auth/auth.functions";

const useSignOut = () => {
	const endSession = useServerFn(signOutStaff);
	const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
	const signOut = async () => {
		setStatus("pending");
		try {
			const result = await endSession();
			if (!result.success) return setStatus("error");
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
