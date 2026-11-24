import {
	BookOpen01Icon,
	Coffee01Icon,
	ComputerIcon,
	Folder01Icon,
	GiftIcon,
	Home01Icon,
	Luggage01Icon,
	Package01Icon,
	Plant01Icon,
	ShoppingBag01Icon,
	Tag01Icon,
	TShirtIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Category } from "./catalog.types";

export const categoryIconOptions = {
	folder: { label: "Folder", glyph: Folder01Icon },
	bag: { label: "Shopping bag", glyph: ShoppingBag01Icon },
	book: { label: "Book", glyph: BookOpen01Icon },
	electronics: { label: "Computer", glyph: ComputerIcon },
	gift: { label: "Gift", glyph: GiftIcon },
	home: { label: "Home", glyph: Home01Icon },
	luggage: { label: "Luggage", glyph: Luggage01Icon },
	mug: { label: "Mug", glyph: Coffee01Icon },
	package: { label: "Package", glyph: Package01Icon },
	plant: { label: "Plant", glyph: Plant01Icon },
	shirt: { label: "Shirt", glyph: TShirtIcon },
	tag: { label: "Tag", glyph: Tag01Icon },
} satisfies Record<Category["icon"], { label: string; glyph: typeof Folder01Icon }>;

export const CategoryIcon = ({ icon }: Pick<Category, "icon">) => (
	<span className="grid size-8 shrink-0 place-items-center rounded-lg border bg-muted/50 text-muted-foreground">
		<HugeiconsIcon icon={categoryIconOptions[icon].glyph} className="size-4" aria-hidden />
	</span>
);
