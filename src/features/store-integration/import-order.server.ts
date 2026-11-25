import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db/client.server";
import { products } from "@/db/schema/catalog";
import { customerIdentities, customers } from "@/db/schema/customers";
import { orderItems, orders, paymentEvents } from "@/db/schema/orders";
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

const lockPrimaryCustomer = async (transaction: Transaction, id: string) => {
	while (true) {
		const [active] = await transaction
			.select({ id: customers.id })
			.from(customers)
			.where(and(eq(customers.id, id), isNull(customers.mergedInto)))
			.for("update");
		if (active) return active.id;
		const [merged] = await transaction
			.select({ target: customers.mergedInto })
			.from(customers)
			.where(eq(customers.id, id));
		if (!merged)
			throw new IntegrationError(409, "The customer changed during import. Retry the request.");
		if (merged.target) id = merged.target;
	}
};

const claimCustomer = async (
	transaction: Transaction,
	{ externalId, ...customer }: ImportOrder["customer"],
) => {
	if (externalId) {
		const [linked] = await transaction
			.select({ id: customerIdentities.customerId })
			.from(customerIdentities)
			.where(eq(customerIdentities.externalId, externalId));
		if (linked) return lockPrimaryCustomer(transaction, linked.id);
	}
	const [inserted] = await transaction
		.insert(customers)
		.values(customer)
		.onConflictDoNothing({ target: customers.email })
		.returning({ id: customers.id });
	const [matched] = inserted
		? [inserted]
		: await transaction
				.select({ id: customers.id })
				.from(customers)
				.where(eq(customers.email, customer.email));
	if (!matched)
		throw new IntegrationError(409, "The customer changed during import. Retry the request.");
	const customerId = await lockPrimaryCustomer(transaction, matched.id);
	if (!externalId) return customerId;
	const [currentIdentity] = await transaction
		.select({ id: customerIdentities.externalId })
		.from(customerIdentities)
		.where(eq(customerIdentities.customerId, customerId))
		.limit(1);
	if (currentIdentity?.id === externalId) return customerId;
	if (currentIdentity)
		throw new IntegrationError(
			409,
			"This email is linked to a different storefront identity. Reconcile the customer first.",
		);
	const [identity] = await transaction
		.insert(customerIdentities)
		.values({ externalId, customerId })
		.onConflictDoNothing()
		.returning({ id: customerIdentities.externalId });
	if (!identity)
		throw new IntegrationError(
			409,
			"The customer identity changed during import. Retry the request.",
		);
	return customerId;
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
			buyerName: input.customer.name,
			buyerEmail: input.customer.email,
			buyerPhone: input.customer.phone,
			importDigest,
			createdAt,
			shippingName,
			shippingAddress,
			paymentStatus: paidAt ? "paid" : "pending",
			cashOnDelivery: input.cashOnDelivery,
			paidAt,
			...totals(input),
		})
		.onConflictDoNothing({ target: orders.number })
		.returning({ id: orders.id, totalMinor: orders.totalMinor });
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
		if (input.paidAt) {
			await transaction.insert(paymentEvents).values({
				orderId: inserted.id,
				status: "paid",
				occurredAt: input.paidAt,
				amountMinor: inserted.totalMinor,
				source: "storefront",
			});
		}
		return { id: inserted.id, created: true };
	});
};
