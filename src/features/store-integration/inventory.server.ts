import { and, eq, inArray } from "drizzle-orm";
import type { output as ZOutput } from "zod";
import { db } from "@/db/client.server";
import { products } from "@/db/schema/catalog";
import { stockMovements, stockReservations } from "@/db/schema/inventory";
import { stockLevelColumns, writeStockLevels } from "@/features/inventory/inventory.server";
import { availableUnits } from "@/features/inventory/stock-adjustment";
import { sha256 } from "./integration-auth.server";
import { IntegrationError, withIntegrationBody } from "./integration-request.server";
import { stockMovementSchema } from "./integration-validation";

const reasons = {
	reserve: "Storefront reserved stock",
	release: "Storefront released stock",
	fulfill: "Storefront recorded dispatch",
};

export const applyStockMovement = ({
	id,
	number,
	operation,
	lines,
}: ZOutput<typeof stockMovementSchema>) =>
	db.transaction(async (transaction) => {
		const quantities = new Map(lines.map(({ sku, quantity }) => [sku, quantity]));
		const canonical = [...quantities].sort(([left], [right]) =>
			left < right ? -1 : left === right ? 0 : 1,
		);
		const digest = sha256(JSON.stringify([number, operation, canonical])).toString("hex");
		const [event] = await transaction
			.insert(stockMovements)
			.values({ id, digest })
			.onConflictDoNothing()
			.returning({ id: stockMovements.id });
		if (!event) {
			const [previous] = await transaction
				.select({ digest: stockMovements.digest })
				.from(stockMovements)
				.where(eq(stockMovements.id, id));
			if (previous?.digest !== digest)
				throw new IntegrationError(409, "This inventory event ID already has different details.");
			return false;
		}
		const matching = await transaction
			.select({ id: products.id, sku: products.sku, status: products.status, ...stockLevelColumns })
			.from(products)
			.where(inArray(products.sku, [...quantities.keys()]))
			.orderBy(products.id)
			.for("update");
		if (matching.length !== lines.length)
			throw new IntegrationError(404, "One or more inventory SKUs were not found.");
		const reservations = await transaction
			.select({ productId: stockReservations.productId, quantity: stockReservations.quantity })
			.from(stockReservations)
			.where(
				and(
					eq(stockReservations.number, number),
					inArray(
						stockReservations.productId,
						matching.map((item) => item.id),
					),
				),
			);
		const heldByProduct = new Map(
			reservations.map(({ productId, quantity }) => [productId, quantity]),
		);
		for (const { id: productId, sku, status, ...before } of matching) {
			const quantity = quantities.get(sku) ?? 0;
			const held = heldByProduct.get(productId) ?? 0;
			if (operation === "reserve" && (status !== "active" || quantity > availableUnits(before)))
				throw new IntegrationError(409, `Insufficient sellable stock for ${sku}.`);
			if (operation !== "reserve" && quantity > held)
				throw new IntegrationError(409, `The order does not hold that quantity of ${sku}.`);
			const reservedChange = operation === "reserve" ? quantity : -quantity;
			const remaining = held + reservedChange;
			if (remaining === 0) {
				await transaction
					.delete(stockReservations)
					.where(
						and(eq(stockReservations.number, number), eq(stockReservations.productId, productId)),
					);
			} else {
				await transaction
					.insert(stockReservations)
					.values({ number, productId, quantity: remaining })
					.onConflictDoUpdate({
						target: [stockReservations.number, stockReservations.productId],
						set: { quantity: remaining },
					});
			}
			await writeStockLevels(
				transaction,
				{
					id: crypto.randomUUID(),
					productId,
					kind: operation,
					quantity,
					reason: reasons[operation],
					reference: number,
				},
				before,
				{
					...before,
					reservedStock: before.reservedStock + reservedChange,
					stock: before.stock - (operation === "fulfill" ? quantity : 0),
				},
			);
		}
		return true;
	});

export const handleStockMovement = ({ request }: { request: Request }) =>
	withIntegrationBody(request, "inventory:write", stockMovementSchema, async (input) => {
		const created = await applyStockMovement(input);
		return Response.json(
			{ id: input.id, number: input.number, operation: input.operation, created },
			{ status: created ? 201 : 200 },
		);
	});
