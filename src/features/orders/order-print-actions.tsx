import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";

export const OrderPrintActions = ({ ids }: { ids: string[] }) => (
	<div className="flex flex-wrap gap-2">
		<Link
			to="/orders/print"
			target="_blank"
			rel="noopener"
			search={{ ids, kind: "packing" }}
			className={buttonVariants({ variant: "outline" })}
		>
			{ids.length > 1 ? "Packing slips" : "Packing slip"}
		</Link>
		<Link
			to="/orders/print"
			target="_blank"
			rel="noopener"
			search={{ ids, kind: "invoice" }}
			className={buttonVariants({ variant: "outline" })}
		>
			{ids.length > 1 ? "Invoices" : "Invoice"}
		</Link>
	</div>
);
