import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { requireStaff } from "@/features/auth/session.server";
import { formDataSchema, idSchema } from "@/lib/validation";
import { mutate } from "@/server/mutation.server";
import { findOrder, listOrderActivity, listOrderItems, saveOrder } from "./order-detail.server";
import { orderDetailSearchSchema, orderFormSchema, orderSearchSchema } from "./order-validation";
import { listOrders } from "./orders.server";

export const readOrders = createServerFn()
	.validator(orderSearchSchema)
	.handler(async ({ data }) => {
		await requireStaff();
		return listOrders(data);
	});

export const readOrder = createServerFn()
	.validator(idSchema.extend(orderDetailSearchSchema.shape))
	.handler(async ({ data }) => {
		await requireStaff();
		const [detail, items, activity] = await Promise.all([
			findOrder(data.id),
			listOrderItems(data.id, data.page),
			listOrderActivity(data.id, data.activity),
		]);
		if (!detail) throw notFound();
		return { ...detail, items, activity };
	});

export const writeOrder = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(async ({ data }) => {
		const staff = await requireStaff("manageCommerce");
		return mutate(orderFormSchema, data, (values) => saveOrder(values, staff.id));
	});
