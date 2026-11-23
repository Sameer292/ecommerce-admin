export const demoId = (kind: number, index: number) =>
	`e000000${kind}-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;

export const slugify = (name: string) => name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-");

const now = Date.now();
export const daysAgo = (days: number) => new Date(now - days * 24 * 60 * 60 * 1_000);
