import { z } from "zod";
import { connection } from "../src/db/client.server";
import { auth } from "../src/features/auth/auth.server";

const input = z.object({
	ADMIN_EMAIL: z.email().transform((value) => value.toLowerCase()),
	ADMIN_PASSWORD: z.string().min(12).max(128),
	ADMIN_NAME: z.string().trim().min(1).max(80).default("Store owner"),
});

try {
	const values = input.parse(process.env);
	await auth.api.createUser({
		body: {
			email: values.ADMIN_EMAIL,
			password: values.ADMIN_PASSWORD,
			name: values.ADMIN_NAME,
			role: "superuser",
		},
	});
	console.log(`Created superuser ${values.ADMIN_EMAIL}`);
} finally {
	await connection.end();
}
