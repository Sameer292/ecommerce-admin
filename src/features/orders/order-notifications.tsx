import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AdminForm } from "@/components/admin/admin-form";
import { FormSection } from "@/components/admin/form-section";
import { formatDateTime } from "@/lib/format";
import type { listOrderNotifications } from "./notifications.server";
import { retryNotification } from "./orders.functions";

const kinds = { shipping: "Shipping update", cancellation: "Cancellation", refund: "Refund" };
const statuses = { pending: "Queued", sending: "Sending", sent: "Sent", failed: "Failed" };

export const OrderNotifications = ({
	notifications,
	editable,
	zone,
}: {
	notifications: Awaited<ReturnType<typeof listOrderNotifications>>;
	editable: boolean;
	zone: string;
}) => {
	const router = useRouter();
	const retry = useServerFn(retryNotification);
	return (
		<FormSection title="Customer notifications" description="Sent by the storefront.">
			{notifications.length ? (
				<ul className="divide-y">
					{notifications.map((job) => (
						<li
							key={job.id}
							className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
						>
							<div>
								<p className="font-medium">
									{kinds[job.kind]} · {statuses[job.status]}
								</p>
								<p className="text-muted-foreground">
									{formatDateTime(job.updatedAt, zone)} · {job.attempts}{" "}
									{job.attempts === 1 ? "attempt" : "attempts"}
								</p>
							</div>
							{editable && job.status === "failed" && (
								<AdminForm
									onSave={(data) => retry({ data })}
									onSuccess={() => router.invalidate()}
									submitLabel="Retry notification"
									successMessage="Notification queued."
								>
									<input type="hidden" name="id" value={job.id} />
								</AdminForm>
							)}
						</li>
					))}
				</ul>
			) : (
				<p className="text-sm text-muted-foreground">No notifications recorded.</p>
			)}
		</FormSection>
	);
};
