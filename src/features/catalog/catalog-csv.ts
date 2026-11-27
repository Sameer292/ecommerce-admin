export const catalogCsvHeaders = [
	"sku",
	"name",
	"slug",
	"price",
	"currency",
	"status",
	"category_slug",
	"description",
	"image_url",
	"parent_sku",
	"variant_options",
] as const;

const spreadsheetFormula = /^'*[=+\-@]/;

export const catalogCsvCell = (value: string) => {
	const escaped = spreadsheetFormula.test(value.trimStart()) ? `'${value}` : value;
	return `"${escaped.replaceAll('"', '""')}"`;
};

const readCsvRecords = (text: string) => {
	const records: string[][] = [];
	let row: string[] = [];
	let field = "";
	let quoted = false;
	let closed = false;
	const saveField = () => {
		row.push(field);
		field = "";
		closed = false;
	};
	const saveRow = () => {
		saveField();
		records.push(row);
		row = [];
	};
	for (let index = 0; index < text.length; index++) {
		const character = text[index];
		if (quoted) {
			if (character !== '"') field += character;
			else if (text[index + 1] === '"') {
				field += '"';
				index++;
			} else {
				quoted = false;
				closed = true;
			}
		} else if (character === ",") saveField();
		else if (character === "\n" || character === "\r") {
			if (character === "\r" && text[index + 1] === "\n") index++;
			saveRow();
		} else if (character === '"' && !closed && field === "") quoted = true;
		else if (closed || character === '"')
			throw new Error(`Unescaped quote in CSV record ${records.length + 1}.`);
		else field += character;
	}
	if (quoted) throw new Error(`Unclosed quote in CSV record ${records.length + 1}.`);
	if (field || row.length || closed) saveRow();
	return records;
};

export const parseCatalogCsv = (text: string) => {
	const [labels, ...records] = readCsvRecords(text.replace(/^\uFEFF/, ""));
	const headers = labels?.map((label) => label.trim()) ?? [];
	if (
		new Set(headers).size !== headers.length ||
		!catalogCsvHeaders.every((label) => headers.includes(label))
	) {
		throw new Error(
			"Use the catalog export column headers in the CSV file, with each header once.",
		);
	}
	const data = records
		.map((record, index) => ({ record, row: index + 2 }))
		.filter(({ record }) => record.some((field) => field.trim()));
	if (data.length === 0 || data.length > 250)
		throw new Error("Include between 1 and 250 product rows per import.");
	return data.map(({ row, record }) => ({
		row,
		invalidLength: record.length !== headers.length,
		cells: Object.fromEntries(
			headers.map((header, index) => {
				const value = record[index] ?? "";
				return [
					header,
					value.startsWith("'") && spreadsheetFormula.test(value.slice(1).trimStart())
						? value.slice(1)
						: value,
				];
			}),
		),
	}));
};
