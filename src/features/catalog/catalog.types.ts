import type { z } from "zod";
import type { categories, products } from "@/db/schema/catalog";
import type {
	categoryFormSchema,
	categorySearchSchema,
	productFormSchema,
	productSearchSchema,
} from "./catalog-validation";

export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type CategoryOption = Pick<Category, "id" | "name">;
export type ProductListRow = Pick<
	Product,
	"id" | "name" | "sku" | "imageUrl" | "status" | "priceMinor" | "stock" | "lowStockThreshold"
> & {
	categoryName: string | null;
};
export type CategoryListRow = Category & { productCount: number };
export type ProductSearch = z.output<typeof productSearchSchema>;
export type CategorySearch = z.output<typeof categorySearchSchema>;
export type ProductValues = z.output<typeof productFormSchema>;
export type CategoryValues = z.output<typeof categoryFormSchema>;
