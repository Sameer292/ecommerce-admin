import { useState } from "react";
import { Button } from "@/components/ui/button";

const contactHref = (kind: "email" | "phone", value: string) => {
	if (kind === "email" && /^[^\s@]+@[^\s@]+$/.test(value))
		return `mailto:${encodeURIComponent(value).replace("%40", "@")}`;
	if (kind === "phone" && /^\+?[0-9().\s-]+$/.test(value) && /\d/.test(value))
		return `tel:${value.replace(/[^+\d]/g, "")}`;
};

export const CustomerContact = ({
	kind,
	value,
	copy = false,
}: {
	kind: "email" | "phone";
	value: string;
	copy?: boolean;
}) => {
	const [message, setMessage] = useState("");
	if (!value) return <span>—</span>;
	const href = contactHref(kind, value);
	return (
		<div className="flex flex-wrap items-center gap-2">
			{href ? (
				<a href={href} className="wrap-anywhere underline underline-offset-2">
					{value}
				</a>
			) : (
				<span>{value}</span>
			)}
			{copy && (
				<>
					<Button
						variant="outline"
						size="sm"
						type="button"
						aria-label={`Copy ${kind}`}
						onClick={async () => {
							try {
								await navigator.clipboard.writeText(value);
								setMessage(`${kind === "email" ? "Email" : "Phone"} copied.`);
							} catch {
								setMessage("Clipboard unavailable. Select and copy the value.");
							}
						}}
					>
						Copy
					</Button>
					<span role="status" className="text-sm text-muted-foreground">
						{message}
					</span>
				</>
			)}
		</div>
	);
};
