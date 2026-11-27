import type { categories, products } from "../../src/db/schema/catalog";
import { currencyDigits } from "../../src/lib/format";
import { env } from "../../src/server/env.server";
import { demoId, slugify } from "./helpers";

const catalog = [
	[
		"Bags & Carry",
		"bag",
		[
			["Ridge Daypack", 68],
			["Linework Canvas Tote", 36],
			["Weekender Duffle", 112],
			["Everyday Dopp Kit", 28],
			["Market Sling", 42],
			["Studio Messenger", 86],
		],
	],
	[
		"Drinkware",
		"mug",
		[
			["Brushed Steel Bottle", 34],
			["Alpine Travel Mug", 38],
			["Studio Pour-Over Set", 64],
			["Hearth Ceramic Cup", 22],
			["Glass Carafe", 45],
		],
	],
	[
		"Stationery",
		"book",
		[
			["Field Notes Journal", 18],
			["Desk Calendar", 24],
			["Pocket Sketchbook", 12],
			["Grid Memo Pad", 9],
			["Archive Pencil Set", 16],
		],
	],
	[
		"Home & Living",
		"home",
		[
			["Entryway Catchall", 48],
			["Amber Glass Candle", 30],
			["Table Linen Set", 72],
			["Bamboo Desk Tray", 39],
			["Still Life Vase", 52],
			["Felt Coaster Set", 19],
		],
	],
	[
		"Accessories",
		"tag",
		[
			["Trail Cap", 32],
			["Everyday Crew Socks", 15],
			["Woven Key Loop", 12],
			["Ridge Webbing Belt", 35],
			["Wool Beanie", 28],
		],
	],
	[
		"Travel",
		"luggage",
		[
			["Packing Cube Set", 46],
			["Passport Wallet", 29],
			["Weekend Wash Bag", 35],
			["Travel Blanket", 58],
			["Luggage Tag Pair", 17],
		],
	],
] as const;

export const demoCategories: (typeof categories.$inferInsert)[] = catalog.map(
	([name, icon], index) => ({
		id: demoId(1, index),
		name,
		icon,
		slug: `demo-${slugify(name)}`,
		description: `A collection of ${name.toLowerCase()} for the sample store.`,
	}),
);

const unit = 10 ** currencyDigits(env.STORE_CURRENCY);

const productRow = (
	name: string,
	price: number,
	category: number,
	slot: number,
): typeof products.$inferInsert => {
	const index = category * 10 + slot;
	return {
		id: demoId(2, index),
		name,
		slug: `demo-${slugify(name)}`,
		sku: `DEMO-${String(index + 1).padStart(3, "0")}`,
		description: `The ${name} from the sample store catalog.`,
		categoryId: demoId(1, category),
		priceMinor: price * unit,
		stock: index % 7 === 0 ? index % 3 : 8 + ((index * 7) % 60),
		status: slot > 3 && category % 2 === 0 ? "draft" : "active",
	};
};

export const demoProducts = catalog.flatMap(([, , entries], category) =>
	entries.map(([name, price], slot) => productRow(name, price, category, slot)),
);
