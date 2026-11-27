import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";

export const OrderPrintActions = ({ orderId }: { orderId: string }) => (
	<div className="flex flex-wrap gap-2">
		<Link
			to="/orders/print"
			target="_blank"
			rel="noopener"
			search={{ ids: [orderId], kind: "packing" }}
			className={buttonVariants({ variant: "outline" })}
		>
			Packing slip
		</Link>
		<Link
			to="/orders/print"
			target="_blank"
			rel="noopener"
			search={{ ids: [orderId], kind: "invoice" }}
			className={buttonVariants({ variant: "outline" })}
		>
			Invoice
		</Link>
	</div>
);
