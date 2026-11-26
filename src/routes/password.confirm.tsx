import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AdminForm } from "@/components/admin/admin-form";
import { AuthLayout } from "@/features/auth/auth-layout";
import { redeemStaffPasswordLink } from "@/features/auth/password.functions";

const PasswordConfirm = () => {
	const { token_hash: tokenHash, type } = Route.useSearch();
	const redeem = useServerFn(redeemStaffPasswordLink);
	return (
		<AuthLayout
			title={type === "invite" ? "Accept staff invitation" : "Confirm password reset"}
			description="Continue to choose your password."
		>
			{tokenHash && type ? (
				<AdminForm
					onSave={(data) => redeem({ data })}
					onSuccess={() => window.location.replace("/password/set")}
					submitLabel="Continue"
				>
					<input type="hidden" name="tokenHash" value={tokenHash} />
					<input type="hidden" name="type" value={type} />
				</AdminForm>
			) : (
				<Link to="/password/reset" className="text-sm font-medium underline">
					Request a new password link
				</Link>
			)}
		</AuthLayout>
	);
};

export const Route = createFileRoute("/password/confirm")({
	validateSearch: (search): { token_hash?: string; type?: "invite" | "recovery" } => ({
		token_hash:
			typeof search.token_hash === "string" && search.token_hash.length <= 256
				? search.token_hash
				: undefined,
		type: search.type === "invite" || search.type === "recovery" ? search.type : undefined,
	}),
	headers: () => ({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" }),
	component: PasswordConfirm,
});
