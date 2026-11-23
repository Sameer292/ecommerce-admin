export const productStatuses = ["draft", "active", "archived"] as const;

export const productStatusLabels = {
	draft: "Draft",
	active: "Active",
	archived: "Archived",
} as const;

export const stockFilters = ["in", "out", "low"] as const;

export const stockFilterLabels = {
	in: "In stock",
	out: "Out of stock",
	low: "Low stock",
} as const;
