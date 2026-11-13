import type * as SentryReact from "@sentry/react";
import type { CourtEnv } from "@court/core";

/** The SDK once Sentry has started; captureError does nothing until then. Only initSentry loads it. */
let sentry: typeof SentryReact | undefined;

/**
 * Sentry as the old app starts it (spec 01.13, ADR 0002 "kept as is"): the DSN, REACT_APP_CONTEXT as environment,
 * the release (`court@<version>`) and BrowserTracing, with Sentry's default integrations on and no tracesSampleRate.
 * Off when no DSN is configured, and then the SDK is not even loaded. Resolves true when Sentry is on.
 */
export async function initSentry(env: CourtEnv, release: string): Promise<boolean> {
  if (env.sentryDsn === undefined) return false;
  const sdk = await import("@sentry/react");
  sdk.init({
    dsn: env.sentryDsn,
    environment: env.context,
    release,
    integrations: [sdk.browserTracingIntegration()],
  });
  sentry = sdk;
  return true;
}

/**
 * Sends an error to Sentry with each key of `extra` as an extra (the old error boundary sent React's errorInfo this
 * way, spec 01.13). Does nothing while Sentry is off, as the old app's DSN-less client did.
 */
export function captureError(error: unknown, extra?: object): void {
  sentry?.captureException(error, { extra: { ...extra } });
}
