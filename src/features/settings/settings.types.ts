import type { output as ZOutput } from "zod";
import type { storeSettingsSchema } from "./store-validation";

export type StoreSettingsValues = ZOutput<typeof storeSettingsSchema>;
export type StoreSettings = StoreSettingsValues & { currency: string };
