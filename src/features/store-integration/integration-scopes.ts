export const integrationScopes = [
	"catalog:read",
	"orders:read",
	"orders:import",
	"payments:write",
	"inventory:write",
	"inventory:alerts",
	"notifications:write",
] as const;
export type IntegrationScope = (typeof integrationScopes)[number];

export const integrationScopeLabels: Record<IntegrationScope, string> = {
	"catalog:read": "Read published catalog",
	"orders:read": "Read order status",
	"orders:import": "Import orders",
	"payments:write": "Record payment events",
	"inventory:write": "Reserve, release, and fulfill stock",
	"inventory:alerts": "Read replenishment alerts",
	"notifications:write": "Process customer notifications",
};
