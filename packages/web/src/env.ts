import { readEnv } from "@court/core";

/** The one place the app reads its configuration: only the public variables vite.config.ts picked (ENV_KEYS). */
export const env = readEnv(__COURT_ENV__);
