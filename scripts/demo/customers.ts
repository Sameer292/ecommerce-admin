import type { customers } from "../../src/db/schema/customers";
import { daysAgo, demoId, slugify } from "./helpers";

const firstNames = [
	"Amara",
	"Elliot",
	"Olivia",
	"Noah",
	"Maya",
	"Avery",
	"Daniel",
	"Sofia",
	"Leo",
	"Zoe",
	"Micah",
	"Nina",
];
const lastNames = ["Hayes", "Kim", "Patel", "Nguyen", "Brooks", "Santos", "Lee"];

export const demoCustomers: (typeof customers.$inferInsert)[] = Array.from(
	{ length: 46 },
	(_, index) => {
		const name = `${firstNames[index % firstNames.length]} ${lastNames[Math.floor(index / lastNames.length)]}`;
		return {
			id: demoId(3, index),
			name,
			email: `${slugify(name)}@example.test`,
			phone: `+1 202-555-${100 + index}`.replace(/-(\d{3})$/, "-0$1"),
			createdAt: daysAgo(index * 2.7),
		};
	},
);
