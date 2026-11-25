import { useListReturn } from "@/components/admin/record-link";
import { listReturnSearchSchema } from "@/lib/list-return";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { DeleteRecord } from "@/components/admin/delete-record";
import { DetailHeading } from "@/components/admin/detail-heading";
import { buttonVariants } from "@/components/ui/button";
import { can } from "@/features/auth/permissions";
import { ProductForm } from "@/features/catalog/product-form";
import { readProduct, removeProduct } from "@/features/catalog/products.functions";

const ProductActions = ({ id, editable }: { id: string; editable: boolean }) => {
	const navigate = useNavigate();
	const returnHref = useListReturn("/products");
	const remove = useServerFn(removeProduct);
	return (
		<div className="flex flex-wrap gap-2">
			<Link
				to="/inventory/$productId"
				params={{ productId: id }}
				className={buttonVariants({ variant: "outline", size: "lg" })}
			>
				View inventory
			</Link>
			{editable && (
				<DeleteRecord
					id={id}
					record="product"
					onDelete={(data) => remove({ data })}
					onSuccess={() => navigate({ href: returnHref })}
				/>
			)}
		</div>
	);
};

const ProductPage = () => {
	const { product, categories } = Route.useLoaderData();
	const { staff, store } = Route.useRouteContext();
	const editable = can(staff.role, "manageCommerce");
	return (
		<>
			<DetailHeading
				title={product.name}
				description={`SKU ${product.sku}`}
				back="/products"
				backLabel="Products"
			>
				<ProductActions id={product.id} editable={editable} />
			</DetailHeading>
			<ProductForm
				key={product.id}
				product={product}
				categories={categories}
				currency={store.currency}
				editable={editable}
			/>
		</>
	);
};

export const Route = createFileRoute("/_admin/products/$productId")({
	validateSearch: listReturnSearchSchema,
	loader: ({ context: { queryClient }, params }) =>
		queryClient.fetchQuery({
			queryKey: ["product", params.productId],
			queryFn: ({ signal }) => readProduct({ data: { id: params.productId }, signal }),
		}),
	component: ProductPage,
});
