import { Package01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { StatusBadge } from "@/components/admin/status-badge";
import { productStatusLabels } from "./catalog-options";
import type { Product } from "./catalog.types";

export const ProductStatus = ({ status }: Pick<Product, "status">) => (
	<StatusBadge tone={status === "active" ? "success" : "neutral"}>
		{productStatusLabels[status]}
	</StatusBadge>
);

export const StockStatus = ({
	stock,
	lowStockThreshold,
}: Pick<Product, "stock" | "lowStockThreshold">) => {
	if (stock === 0) return <StatusBadge tone="danger">Out of stock</StatusBadge>;
	if (stock <= lowStockThreshold) return <StatusBadge tone="warning">Low stock</StatusBadge>;
	return <StatusBadge tone="success">In stock</StatusBadge>;
};

export const ProductPhoto = ({ imageUrl }: Pick<Product, "imageUrl">) => (
	<span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted/50 text-muted-foreground">
		{imageUrl ? (
			<img
				src={imageUrl}
				alt=""
				loading="lazy"
				referrerPolicy="no-referrer"
				className="size-full object-cover"
			/>
		) : (
			<HugeiconsIcon icon={Package01Icon} className="size-4" aria-hidden />
		)}
	</span>
);
