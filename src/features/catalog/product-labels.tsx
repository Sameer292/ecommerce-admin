import { Package01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { StatusBadge } from "@/components/admin/status-badge";
import { lowStockThreshold, productStatusLabels } from "./catalog-options";
import type { Product } from "./catalog.types";

export const ProductStatus = ({ status }: Pick<Product, "status">) => (
	<StatusBadge tone={status === "active" ? "success" : "neutral"}>
		{productStatusLabels[status]}
	</StatusBadge>
);

export const StockStatus = ({ stock }: Pick<Product, "stock">) => {
	if (stock === 0) return <StatusBadge tone="danger">Out of stock</StatusBadge>;
	if (stock <= lowStockThreshold) return <StatusBadge tone="warning">Low stock</StatusBadge>;
	return <StatusBadge tone="success">In stock</StatusBadge>;
};

export const ProductPhoto = ({ imageUrl }: Pick<Product, "imageUrl">) => {
	const [failedUrl, setFailedUrl] = useState<string>();
	return (
		<span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted/50 text-muted-foreground">
			{imageUrl && imageUrl !== failedUrl ? (
				<img
					src={imageUrl}
					alt=""
					loading="lazy"
					referrerPolicy="no-referrer"
					className="size-full object-cover"
					onError={() => setFailedUrl(imageUrl)}
				/>
			) : (
				<HugeiconsIcon icon={Package01Icon} className="size-4" aria-hidden />
			)}
		</span>
	);
};
