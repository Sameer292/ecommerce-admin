import type { output as ZOutput } from "zod";
import type { categories, products } from "@/db/schema/catalog";
import type { stockFilters } from "./catalog-options";
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
	"id" | "createdAt" | "name" | "sku" | "imageUrl" | "status" | "priceMinor" | "stock"
> & {
	categoryName: string | null;
	availableStock: number;
};
export type CategoryListRow = Category & { productCount: number };
export type StockFilter = (typeof stockFilters)[number];
export type ProductSearch = ZOutput<typeof productSearchSchema>;
export type CategorySearch = ZOutput<typeof categorySearchSchema>;
export type ProductValues = ZOutput<typeof productFormSchema>;
export type CategoryValues = ZOutput<typeof categoryFormSchema>;
