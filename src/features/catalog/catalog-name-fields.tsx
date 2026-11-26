import { useState } from "react";
import { TextField } from "@/components/admin/form-fields";

const suggestSlug = (name: string) =>
	name
		.normalize("NFKD")
		.replace(/\p{Mark}/gu, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 100)
		.replace(/-$/, "");

export const CatalogNameFields = ({
	initialName = "",
	initialSlug,
}: {
	initialName?: string;
	initialSlug?: string;
}) => {
	const [custom, setCustom] = useState(initialSlug !== undefined);
	const [slug, setSlug] = useState(initialSlug ?? suggestSlug(initialName));
	return (
		<>
			<TextField
				name="name"
				label="Name"
				defaultValue={initialName}
				maxLength={120}
				required
				onChange={(event) => {
					if (!custom) setSlug(suggestSlug(event.currentTarget.value));
				}}
			/>
			<TextField
				name="slug"
				label="Slug"
				value={slug}
				maxLength={100}
				required
				pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
				hint="Lowercase letters, numbers, and hyphens."
				onChange={(event) => {
					setCustom(true);
					setSlug(event.currentTarget.value);
				}}
			/>
		</>
	);
};
