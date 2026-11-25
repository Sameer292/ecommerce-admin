import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { requireStaff, withStaffMutation } from "@/features/auth/session.server";
import { formDataSchema, idSchema } from "@/lib/validation";
import { orderSearchSchema } from "@/features/orders/order-validation";
import { listOrders } from "@/features/orders/orders.server";
import { mutate } from "@/server/mutation.server";
import { anonymizeCustomerData } from "./customer-privacy.server";
import {
	anonymizeCustomerSchema,
	customerFormSchema,
	customerSearchSchema,
	mergeCustomerSchema,
} from "./customer-validation";
import {
	customerOrderSummary,
	deleteCustomer,
	findCustomer,
	listCustomers,
	mergeDuplicateCustomer,
	saveCustomer,
} from "./customers.server";

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
		const [customer, orders, summary] = await Promise.all([
			findCustomer(data.id),
			listOrders({ page: data.page, q: "", sort: data.sort }, data.id),
			customerOrderSummary(data.id),
		]);
		if (!customer) throw notFound();
		return {
			customer: customer.mergedInto
				? {
						...customer,
						name: "Customer merged",
						email: "",
						phone: "",
						notes: "",
						mergeReason: null,
					}
				: customer,
			orders,
			summary,
		};
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

export const mergeCustomer = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(({ data }) =>
		withStaffMutation("manageCommerce", (staff) =>
			mutate(mergeCustomerSchema, data, (input) => mergeDuplicateCustomer(input, staff.id)),
		),
	);

export const anonymizeCustomer = createServerFn({ method: "POST" })
	.validator(formDataSchema)
	.handler(({ data }) =>
		withStaffMutation("manageCommerce", (staff) =>
			mutate(anonymizeCustomerSchema, data, (input) => anonymizeCustomerData(input, staff.id)),
		),
	);
