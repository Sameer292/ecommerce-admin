import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { requireStaff, withStaffMutation } from "@/features/auth/session.server";
import { formDataSchema, idSchema } from "@/lib/validation";
import { orderSearchSchema } from "@/features/orders/order-validation";
import { listOrders } from "@/features/orders/orders.server";
import { mutate } from "@/server/mutation.server";
import { customerFormSchema, customerSearchSchema } from "./customer-validation";
import { deleteCustomer, findCustomer, listCustomers, saveCustomer } from "./customers.server";

export const readCustomers = createServerFn()
	.validator(customerSearchSchema)
	.handler(async ({ data }) => {
		await requireStaff();
		return listCustomers(data);
	});

export const readCustomer = createServerFn()
	.validator(idSchema.extend(orderSearchSchema.pick({ page: true, sort: true }).shape))
	.handler(async ({ data }) => {
		await requireStaff();
		const [customer, orders] = await Promise.all([
			findCustomer(data.id),
			listOrders({ page: data.page, q: "", sort: data.sort }, data.id),
		]);
		if (!customer) throw notFound();
		return { customer, orders };
	});

export const writeCustomer = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(({ data }) =>
		withStaffMutation("manageCommerce", () =>
			mutate(customerFormSchema, data, saveCustomer, {
				23505: "A customer already uses this email address.",
			}),
		),
	);

export const removeCustomer = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(({ data }) =>
		withStaffMutation("manageCommerce", () =>
			mutate(idSchema, data, ({ id }) => deleteCustomer(id), {
				23503: "This customer has order history and must be retained.",
			}),
		),
	);
