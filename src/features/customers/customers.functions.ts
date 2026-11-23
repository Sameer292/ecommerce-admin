import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { requireStaff } from "@/features/auth/session.server";
import { formDataSchema, idSchema } from "@/lib/validation";
import { listOrders } from "@/features/orders/orders.server";
import { pageSearchSchema } from "@/lib/pagination";
import { mutate } from "@/server/mutation.server";
import { customerFormSchema } from "./customer-validation";
import { deleteCustomer, findCustomer, listCustomers, saveCustomer } from "./customers.server";

export const readCustomers = createServerFn()
	.validator(pageSearchSchema)
	.handler(async ({ data }) => {
		await requireStaff();
		return listCustomers(data);
	});

export const readCustomer = createServerFn()
	.validator(idSchema.extend({ page: pageSearchSchema.shape.page }))
	.handler(async ({ data }) => {
		await requireStaff();
		const [customer, orders] = await Promise.all([
			findCustomer(data.id),
			listOrders({ page: data.page, q: "" }, data.id),
		]);
		if (!customer) throw notFound();
		return { customer, orders };
	});

export const writeCustomer = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(async ({ data }) => {
		await requireStaff("manageCommerce");
		return mutate(customerFormSchema, data, saveCustomer, {
			23505: "A customer already uses this email address.",
		});
	});

export const removeCustomer = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(async ({ data }) => {
		await requireStaff("manageCommerce");
		return mutate(idSchema, data, ({ id }) => deleteCustomer(id), {
			23503: "This customer has order history and must be retained.",
		});
	});
