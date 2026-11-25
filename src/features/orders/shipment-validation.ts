import {
	array as ZArray,
	int as ZInt,
	iso as ZIso,
	literal as ZLiteral,
	object as ZObject,
	string as ZString,
	union as ZUnion,
	url as ZUrl,
	uuid as ZUuid,
} from "zod";
import type { output as ZOutput } from "zod";

const lineSchema = ZObject({ itemId: ZUuid(), quantity: ZInt().min(1).max(1_000_000) });
const packageLines = ZArray(lineSchema)
	.min(1, "Add units to this package.")
	.max(100)
	.refine(
		(lines) => new Set(lines.map(({ itemId }) => itemId)).size === lines.length,
		"Each item can appear once per package.",
	);

export const shipmentSchema = ZObject({
	id: ZUuid(),
	orderId: ZUuid(),
	version: ZIso.datetime(),
	carrier: ZString().trim().min(1, "Enter a carrier.").max(80),
	service: ZString().trim().max(80),
	trackingNumber: ZString().trim().max(100),
	trackingUrl: ZUnion([ZLiteral(""), ZUrl({ protocol: /^https$/ })]).pipe(ZString().max(2000)),
	lines: ZString()
		.max(16_000)
		.transform((value) => {
			try {
				return JSON.parse(value) as unknown;
			} catch {
				return null;
			}
		})
		.pipe(packageLines),
});

export type ShipmentValues = ZOutput<typeof shipmentSchema>;
