import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AdminForm } from "@/components/admin/admin-form";
import { DetailHeading } from "@/components/admin/detail-heading";
import { TextField } from "@/components/admin/form-fields";
import { FormSection } from "@/components/admin/form-section";
import { Field, FieldLabel } from "@/components/ui/field";
import {
	createIntegrationKey,
	readIntegrationKeys,
	removeIntegrationKey,
} from "@/features/store-integration/integration-keys.functions";
import {
	integrationScopeLabels,
	integrationScopes,
} from "@/features/store-integration/integration-scopes";
import { formatCount, formatDateTime } from "@/lib/format";

const IntegrationCredentials = () => {
	const keys = Route.useLoaderData();
	const { store } = Route.useRouteContext();
	const router = useRouter();
	const issue = useServerFn(createIntegrationKey);
	const revoke = useServerFn(removeIntegrationKey);
	const [token, setToken] = useState("");
	return (
		<>
			<DetailHeading
				title="Integration credentials"
				description="Issue scoped keys and replace them before revoking existing credentials."
				back="/settings"
				backLabel="Settings"
			/>
			<FormSection title="Issue a credential">
				{token && (
					<div className="rounded-lg border p-3 text-sm">
						<p>Copy this key now. Its value is shown once.</p>
						<code className="select-all wrap-anywhere">{token}</code>
					</div>
				)}
				<AdminForm
					onSave={async (data) => {
						const result = await issue({ data });
						if (result.success && "token" in result) setToken(result.token);
						return result;
					}}
					onSuccess={() => router.invalidate()}
					submitLabel="Issue key"
				>
					<TextField name="name" label="Credential name" required maxLength={80} />
					<fieldset className="space-y-2">
						<legend className="text-sm font-medium">Permissions</legend>
						{integrationScopes.map((scope) => (
							<Field key={scope} orientation="horizontal">
								<input type="checkbox" id={`scope-${scope}`} name="scope" value={scope} />
								<FieldLabel htmlFor={`scope-${scope}`}>{integrationScopeLabels[scope]}</FieldLabel>
							</Field>
						))}
					</fieldset>
				</AdminForm>
			</FormSection>
			<FormSection title="Credential activity">
				{keys.length === 0 && (
					<p className="text-sm text-muted-foreground">No credentials have been issued or used.</p>
				)}
				<ul className="divide-y text-sm">
					{keys.map((key) => (
						<li key={key.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
							<div>
								<h3 className="font-semibold">{key.name}</h3>
								<p>{key.scopes.map((scope) => integrationScopeLabels[scope]).join(" · ")}</p>
								<p className="text-muted-foreground">
									{formatCount(key.requestCount)} requests ·{" "}
									{key.lastUsedAt
										? `Last used ${formatDateTime(key.lastUsedAt, store.timeZone)}`
										: "Unused"}
									{key.revokedAt ? " · Revoked" : ""}
								</p>
								{key.legacy && (
									<p className="text-muted-foreground">
										Managed through the deployment environment.
									</p>
								)}
							</div>
							{!key.legacy && !key.revokedAt && (
								<AdminForm
									onSave={(data) => revoke({ data })}
									onSuccess={() => router.invalidate()}
									submitLabel="Revoke key"
									successMessage="Credential revoked."
									destructive
								>
									<input type="hidden" name="id" value={key.id} />
								</AdminForm>
							)}
						</li>
					))}
				</ul>
			</FormSection>
		</>
	);
};

export const Route = createFileRoute("/_admin/integrations")({
	loader: () => readIntegrationKeys(),
	component: IntegrationCredentials,
});
