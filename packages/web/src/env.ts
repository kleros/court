import { readEnv } from "@court/core";

/** The one place the app reads its configuration. */
export const env = readEnv(import.meta.env);
