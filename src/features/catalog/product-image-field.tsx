import { useEffect, useState } from "react";
import { TextField } from "@/components/admin/form-fields";
import { FormSection } from "@/components/admin/form-section";
import { Button } from "@/components/ui/button";
import { httpsImageUrlPattern } from "./catalog-validation";

export const ProductImageField = ({
	external,
	managed,
	editable,
	onPreview,
}: {
	external: string;
	managed: string;
	editable: boolean;
	onPreview: (source: string) => void;
}) => {
	const [url, setUrl] = useState(external);
	const [file, setFile] = useState<File>();
	const [removed, setRemoved] = useState(false);
	const [fileInput, setFileInput] = useState(0);
	const image = url ? (/^https:\/\//i.test(url) ? url : "") : removed ? "" : managed;
	useEffect(() => {
		if (!file) {
			onPreview(image);
			return;
		}
		const preview = URL.createObjectURL(file);
		onPreview(preview);
		return () => URL.revokeObjectURL(preview);
	}, [file, image, onPreview]);
	return (
		<FormSection title="Product image">
			<input type="hidden" name="removeImage" value={removed ? "yes" : "no"} />
			{editable && (
				<TextField
					key={fileInput}
					name="imageFile"
					label={image ? "Replace image" : "Upload image"}
					type="file"
					accept="image/png,image/jpeg,image/webp"
					hint="PNG, JPEG or WebP, up to 3 MB."
					onChange={(event) => setFile(event.currentTarget.files?.[0])}
				/>
			)}
			<TextField
				name="imageUrl"
				label="Image URL"
				type="url"
				pattern={httpsImageUrlPattern}
				placeholder="https://"
				hint="You can also use an HTTPS image URL."
				maxLength={2000}
				value={url}
				onChange={(event) => setUrl(event.currentTarget.value)}
			/>
			{editable && (file || url || (managed && !removed)) && (
				<Button
					className="w-fit"
					type="button"
					variant="outline"
					onClick={() => {
						setFile(undefined);
						setFileInput((current) => current + 1);
						setUrl("");
						setRemoved(true);
					}}
				>
					Remove image
				</Button>
			)}
		</FormSection>
	);
};
