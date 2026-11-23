import { connection, db } from "../src/db/client.server";
import { categories, products } from "../src/db/schema/catalog";
import { customers } from "../src/db/schema/customers";
import { orderItems, orders } from "../src/db/schema/orders";
import { demoCategories, demoProducts } from "./demo/catalog";
import { demoCustomers } from "./demo/customers";
import { demoItems, demoOrders } from "./demo/orders";

try {
	if (process.env.NODE_ENV === "production")
		throw new Error("Demo seed is for development databases.");
	await db.transaction(async (transaction) => {
		await transaction
			.insert(categories)
			.values(demoCategories)
			.onConflictDoNothing({ target: categories.id });
		await transaction
			.insert(products)
			.values(demoProducts)
			.onConflictDoNothing({ target: products.id });
		await transaction
			.insert(customers)
			.values(demoCustomers)
			.onConflictDoNothing({ target: customers.id });
		await transaction.insert(orders).values(demoOrders).onConflictDoNothing({ target: orders.id });
		await transaction
			.insert(orderItems)
			.values(demoItems)
			.onConflictDoNothing({ target: orderItems.id });
	});
	console.log("Demo catalog, customers, and orders are ready.");
} finally {
	await connection.end();
}
