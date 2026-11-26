import { createServerFn } from "@tanstack/react-start";
import { requireStaff } from "@/features/auth/session.server";
import { pageSearchSchema } from "@/lib/pagination";
import { listAudit } from "./audit.server";

export const readAudit = createServerFn()
	.validator(pageSearchSchema)
	.handler(async ({ data }) => {
		await requireStaff("manageTeam");
		return listAudit(data);
	});
