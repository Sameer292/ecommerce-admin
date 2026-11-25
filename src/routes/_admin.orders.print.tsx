import { createFileRoute } from "@tanstack/react-router";
import { PageHeading } from "@/components/admin/page-heading";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { orderDocumentSearchSchema } from "@/features/orders/order-validation";
import { readOrderDocuments } from "@/features/orders/orders.functions";
import { formatCount, formatDate, formatMoney } from "@/lib/format";

type Document = Awaited<ReturnType<typeof readOrderDocuments>>[number];

const OrderDocument = ({
	document: { order, items },
	name,
	email,
	zone,
	currency,
	invoice,
}: {
	document: Document;
	name: string;
	email: string;
	zone: string;
	currency: string;
	invoice: boolean;
}) => (
	<article className="flex flex-col gap-5 bg-white p-5 text-black [--foreground:black] [--border:#d4d4d4] print:break-after-page print:p-0 print:last:break-after-auto print:[&_[data-slot=table-container]]:overflow-visible">
		<header className="flex flex-wrap justify-between gap-3 border-b pb-3">
			<div>
				<h2 className="text-xl font-semibold">
					{invoice ? "Invoice" : "Packing slip"} · {order.number}
				</h2>
				<p>{formatDate(order.createdAt, zone)}</p>
			</div>
			<div>
				<p className="font-semibold">{name}</p>
				{email && <p>{email}</p>}
			</div>
		</header>
		<div className="grid gap-3 text-sm sm:grid-cols-2">
			<div>
				<h3 className="font-semibold">Ship to</h3>
				<p>{order.shippingName || order.buyerName}</p>
				<p className="whitespace-pre-wrap">{order.shippingAddress || "No delivery address"}</p>
			</div>
			{invoice && (
				<div>
					<h3 className="font-semibold">Buyer</h3>
					<p>{order.buyerName}</p>
					<p>{order.buyerEmail}</p>
				</div>
			)}
		</div>
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead scope="col">Item</TableHead>
					<TableHead scope="col">SKU</TableHead>
					<TableHead scope="col" className="text-right">
						Quantity
					</TableHead>
					{invoice && (
						<>
							<TableHead scope="col" className="text-right">
								Unit price
							</TableHead>
							<TableHead scope="col" className="text-right">
								Line total
							</TableHead>
						</>
					)}
				</TableRow>
			</TableHeader>
			<TableBody>
				{items.map((item) => (
					<TableRow key={item.id} className="print:break-inside-avoid">
						<TableCell className="whitespace-normal">{item.name}</TableCell>
						<TableCell>{item.sku}</TableCell>
						<TableCell className="text-right">{formatCount(item.quantity)}</TableCell>
						{invoice && (
							<>
								<TableCell className="text-right">
									{formatMoney(item.unitPriceMinor, currency)}
								</TableCell>
								<TableCell className="text-right">
									{formatMoney(item.unitPriceMinor * item.quantity, currency)}
								</TableCell>
							</>
						)}
					</TableRow>
				))}
			</TableBody>
		</Table>
		{invoice && (
			<dl className="ml-auto grid gap-1 text-sm">
				{[
					{ label: "Subtotal", amount: order.subtotalMinor },
					{ label: "Shipping", amount: order.shippingMinor },
					{ label: "Tax", amount: order.taxMinor },
					{ label: "Discount", amount: -order.discountMinor || 0 },
					{ label: "Total", amount: order.totalMinor },
				].map(({ label, amount }) => (
					<div key={label} className="flex justify-between gap-6">
						<dt>{label}</dt>
						<dd>{formatMoney(amount, currency)}</dd>
					</div>
				))}
			</dl>
		)}
	</article>
);

const PrintPage = () => {
	const documents = Route.useLoaderData();
	const { kind, ids } = Route.useSearch();
	const { store } = Route.useRouteContext();
	return (
		<>
			<div className="print:hidden">
				<PageHeading
					title={kind === "invoice" ? "Print invoices" : "Print packing slips"}
					description="Each selected order starts on its own printed page."
				>
					<Button onClick={() => window.print()} disabled={documents.length === 0}>
						Print
					</Button>
				</PageHeading>
			</div>
			{documents.length < ids.length && (
				<p className="print:hidden">Some selected orders are unavailable.</p>
			)}
			{documents.length === 0 && <p>Choose orders to print from the orders list.</p>}
			{documents.map((document) => (
				<OrderDocument
					key={document.order.id}
					document={document}
					name={store.name}
					email={store.contactEmail}
					zone={store.timeZone}
					currency={store.currency}
					invoice={kind === "invoice"}
				/>
			))}
		</>
	);
};

export const Route = createFileRoute("/_admin/orders/print")({
	validateSearch: orderDocumentSearchSchema,
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) => readOrderDocuments({ data: deps }),
	component: PrintPage,
});
