import type { CourtEnv } from "@court/core";

/** Sentry as today (ADR 0002, 03 DEC-T08): on only when a DSN is configured; the SDK is not even loaded otherwise. */
export async function initSentry(env: CourtEnv): Promise<boolean> {
  if (env.sentryDsn === undefined) return false;
  const Sentry = await import("@sentry/react");
  Sentry.init({ dsn: env.sentryDsn, ...(env.context === undefined ? {} : { environment: env.context }) });
  return true;
}
