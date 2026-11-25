import { object as ZObject, string as ZString } from "zod";
import { connection } from "../src/db/client.server";
import { staffEmailSchema, staffPasswordSchema } from "../src/features/auth/auth-validation";
import { createStaffAccount } from "../src/features/team/provision-staff.server";

const input = ZObject({
	ADMIN_EMAIL: staffEmailSchema,
	ADMIN_PASSWORD: staffPasswordSchema,
	ADMIN_NAME: ZString().trim().min(1).max(80).default("Store owner"),
});

try {
	const values = input.parse(process.env);
	await createStaffAccount({
		email: values.ADMIN_EMAIL,
		password: values.ADMIN_PASSWORD,
		name: values.ADMIN_NAME,
		role: "superuser",
	});
	console.log(`Created superuser ${values.ADMIN_EMAIL}`);
} finally {
	await connection.end();
}
