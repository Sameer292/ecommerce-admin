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

const ProductActions = ({
	id,
	name,
	editable,
	hasHistory,
}: {
	id: string;
	name: string;
	editable: boolean;
	hasHistory: boolean;
}) => {
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
				<Link
					to="/products/new"
					search={{ duplicate: id, returnTo: returnHref }}
					className={buttonVariants({ variant: "outline", size: "lg" })}
				>
					Duplicate as draft
				</Link>
			)}
			{editable && (
				<DeleteRecord
					id={id}
					record="product"
					name={name}
					blockedReason={
						hasHistory
							? "This product has order or inventory history. Archive it to retain its records."
							: undefined
					}
					onDelete={(data) => remove({ data })}
					onSuccess={() => navigate({ href: returnHref })}
				/>
			)}
		</div>
	);
};

const ProductPage = () => {
	const { product, categories, hasHistory } = Route.useLoaderData();
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
				<ProductActions
					id={product.id}
					name={product.name}
					editable={editable}
					hasHistory={hasHistory}
				/>
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
