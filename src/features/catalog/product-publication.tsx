import { FormSection } from "@/components/admin/form-section";
import { formatMoney } from "@/lib/format";
import { parseMoneyInput } from "@/lib/money";

export type PublicationFields = {
	name: string;
	description: string;
	categoryId: string;
	imageUrl: string;
	price: string;
	status: string;
};

export const ProductPublication = ({
	fields,
	currency,
}: {
	fields: PublicationFields;
	currency: string;
}) => {
	const { name, description, categoryId, imageUrl, price, status } = fields;
	const photo = /^https:\/\//i.test(imageUrl) ? imageUrl : "";
	const amount = parseMoneyInput(price, currency);
	const warnings = [
		!description.trim() && "Add a description.",
		!categoryId && "Choose a category.",
		!photo && "Add a product image.",
	].filter(Boolean);
	return (
		<FormSection title="Storefront preview">
			<div className="overflow-hidden rounded-lg border bg-card">
				{photo && (
					<img
						src={photo}
						alt={name}
						referrerPolicy="no-referrer"
						className="aspect-video w-full bg-muted object-contain"
					/>
				)}
				<div className="space-y-2 p-4">
					<h3 className="wrap-anywhere font-heading text-base font-semibold">
						{name.trim() || "Product name"}
					</h3>
					<p className="text-sm font-medium tabular-nums">
						{amount === null ? "Price pending" : formatMoney(amount, currency)}
					</p>
					{description.trim() && (
						<p className="wrap-anywhere whitespace-pre-wrap text-sm text-muted-foreground">
							{description}
						</p>
					)}
				</div>
			</div>
			{status === "active" && warnings.length > 0 && (
				<div role="status" className="rounded-lg border p-3 text-sm">
					<h3 className="font-medium">Review before publishing</h3>
					<ul className="mt-1 list-disc pl-5">
						{warnings.map((warning) => (
							<li key={String(warning)}>{warning}</li>
						))}
					</ul>
				</div>
			)}
		</FormSection>
	);
};
