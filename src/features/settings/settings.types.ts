import type { z } from "zod";
import type { storeSettingsSchema } from "./store-validation";

export type StoreSettingsValues = z.output<typeof storeSettingsSchema>;
export type StoreSettings = StoreSettingsValues & { currency: string };
