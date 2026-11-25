import { eq, inArray } from "drizzle-orm";
import { db } from "@/db/client.server";
import { products } from "@/db/schema/catalog";
import { customers } from "@/db/schema/customers";
import { orderItems, orders } from "@/db/schema/orders";
import { maxMinorAmount } from "@/lib/money";
import { getStoreCurrency } from "@/features/settings/store-currency.server";
import { sha256 } from "./integration-auth.server";
import { IntegrationError } from "./integration-request.server";
import type { ImportOrder, Transaction } from "./integration.types";

const totals = ({ items, shippingMinor, taxMinor, discountMinor }: ImportOrder) => {
	const subtotalMinor = items.reduce((sum, line) => sum + line.quantity * line.unitPriceMinor, 0);
	const totalMinor = subtotalMinor + shippingMinor + taxMinor - discountMinor;
	if (totalMinor < 0 || subtotalMinor > maxMinorAmount || totalMinor > maxMinorAmount) {
		throw new IntegrationError(400, "Order amounts exceed the supported range.");
	}
	return { totalMinor, subtotalMinor, shippingMinor, taxMinor, discountMinor };
};

const claimCustomer = async (transaction: Transaction, customer: ImportOrder["customer"]) => {
	const [entry] = await transaction
		.insert(customers)
		.values(customer)
		.onConflictDoUpdate({ target: customers.email, set: { email: customer.email } })
		.returning({ id: customers.id });
	return entry.id;
};

const saveItems = async (
	transaction: Transaction,
	orderId: string,
	items: ImportOrder["items"],
) => {
	const matches = await transaction
		.select({ sku: products.sku, id: products.id })
		.from(products)
		.where(
			inArray(
				products.sku,
				items.map((item) => item.sku),
			),
		);
	const ids = new Map(matches.map(({ sku, id }) => [sku, id]));
	await transaction
		.insert(orderItems)
		.values(items.map((item) => ({ ...item, orderId, productId: ids.get(item.sku) })));
};

const sameImport = (found: { id: string; importDigest: string | null }, digest: string) => {
	if (found.importDigest !== digest)
		throw new IntegrationError(409, "An order with this number already exists.");
	return { id: found.id, created: false };
};

const insertOrder = async (transaction: Transaction, input: ImportOrder, importDigest: string) => {
	const { number, paidAt, createdAt, shippingName, shippingAddress } = input;
	const customerId = await claimCustomer(transaction, input.customer);
	const [inserted] = await transaction
		.insert(orders)
		.values({
			number,
			customerId,
			importDigest,
			createdAt,
			shippingName,
			shippingAddress,
			paymentStatus: paidAt ? "paid" : "pending",
			paidAt,
			...totals(input),
		})
		.onConflictDoNothing({ target: orders.number })
		.returning({ id: orders.id });
	return inserted;
};

export const importOrder = async (input: ImportOrder) => {
	if (input.currency !== (await getStoreCurrency()))
		throw new IntegrationError(400, "Order currency differs from the store currency.");
	if (input.paidAt && input.paidAt < input.createdAt)
		throw new IntegrationError(400, "Payment cannot predate the order.");

	return db.transaction(async (transaction) => {
		const findExisting = () =>
			transaction
				.select({ id: orders.id, importDigest: orders.importDigest })
				.from(orders)
				.where(eq(orders.number, input.number));
		const digest = sha256(JSON.stringify(input)).toString("hex");
		const [existing] = await findExisting();
		if (existing) return sameImport(existing, digest);
		const inserted = await insertOrder(transaction, input, digest);
		if (!inserted) {
			const [concurrent] = await findExisting();
			if (!concurrent)
				throw new IntegrationError(409, "The order changed during import. Retry the request.");
			return sameImport(concurrent, digest);
		}
		await saveItems(transaction, inserted.id, input.items);
		return { id: inserted.id, created: true };
	});
};
