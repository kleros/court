/// <reference types="vite/client" />

/** The app's public variables (ENV_KEYS only), picked at build by vite.config.ts; read only through src/env.ts. */
declare const __COURT_ENV__: Readonly<Record<string, string>>;
/** The root package.json's version, set at build by vite.config.ts (Sentry release court@<version>). */
declare const __COURT_VERSION__: string;
