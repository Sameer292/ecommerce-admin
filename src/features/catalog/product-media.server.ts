import { supabaseStorage } from "@/features/auth/supabase-admin.server";
import { ActionError } from "@/server/mutation.server";
import { logRequestFailure } from "@/server/request-diagnostics.server";

const bucket = "commerce-product-images";
const fileSizeLimit = 3 * 1024 * 1024;
const formats = {
	"image/png": "png",
	"image/jpeg": "jpg",
	"image/webp": "webp",
} as const;

const storage = () => supabaseStorage.from(bucket);

export const productImageUrl = (key: string, fallback = "") =>
	key ? storage().getPublicUrl(key).data.publicUrl : fallback;

const imageType = (bytes: Uint8Array) => {
	const ascii = new TextDecoder();
	if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value))
		return "image/png";
	if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
	if (ascii.decode(bytes.slice(0, 4)) === "RIFF" && ascii.decode(bytes.slice(8, 12)) === "WEBP")
		return "image/webp";
};

const ensurePublicBucket = async () => {
	const { data } = await supabaseStorage.getBucket(bucket);
	if (data?.public) return;
	if (!data) {
		const { error } = await supabaseStorage.createBucket(bucket, {
			public: true,
			allowedMimeTypes: Object.keys(formats),
			fileSizeLimit,
		});
		if (!error || (await supabaseStorage.getBucket(bucket)).data?.public) return;
		logRequestFailure("create product image bucket", error);
	}
	throw new ActionError("The public product image bucket is unavailable.", "imageFile");
};

export const uploadProductImage = async (file: File) => {
	if (file.size > fileSizeLimit)
		throw new ActionError("Choose an image no larger than 3 MB.", "imageFile");
	const contentType = imageType(new Uint8Array(await file.slice(0, 12).arrayBuffer()));
	if (!contentType) throw new ActionError("Choose a PNG, JPEG, or WebP image.", "imageFile");
	await ensurePublicBucket();
	const key = `${crypto.randomUUID()}.${formats[contentType]}`;
	const { error } = await storage().upload(key, file, {
		contentType,
		cacheControl: "86400",
		upsert: false,
	});
	if (error) {
		logRequestFailure("upload product image", error);
		throw new ActionError("Couldn’t upload the image. Try again.", "imageFile");
	}
	return key;
};

export const discardProductUpload = async (key: string) => {
	const { error } = await storage().remove([key]);
	if (error) logRequestFailure("discard uncommitted product image", error);
};
