import { z } from "zod";

export const idSchema = z.object({ id: z.uuid() });
export const formDataSchema = z.instanceof(FormData);
export const optionalId = z.union([z.uuid(), z.literal("")]).transform((id) => id || undefined);
