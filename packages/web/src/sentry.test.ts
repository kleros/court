import type { ErrorInfo } from "react";
import type * as SentryReact from "@sentry/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readEnv } from "@court/core";

const DSN = "https://key@o1.ingest.sentry.example/42";

// Counts every load of the SDK module and records what the app hands it. The real browserTracingIntegration stays,
// so the tests see the name the SDK itself gives that integration.
const sdk = {
  loads: 0,
  init: vi.fn<typeof SentryReact.init>(),
  captureException: vi.fn<typeof SentryReact.captureException>(),
};

beforeEach(() => {
  // sentry.ts keeps the loaded SDK in module state: every test starts from a fresh copy of it. doMock again so the
  // SDK module is evaluated afresh too (vi.resetModules alone keeps a mocked module), which is what `loads` counts.
  vi.resetModules();
  vi.doMock("@sentry/react", async (importOriginal) => {
    sdk.loads += 1;
    return { ...(await importOriginal<typeof SentryReact>()), init: sdk.init, captureException: sdk.captureException };
  });
  sdk.loads = 0;
  sdk.init.mockClear();
  sdk.captureException.mockClear();
});

describe("Sentry, started as the old app starts it (spec 01.13, ADR 0002)", () => {
  it("starts with the DSN, REACT_APP_CONTEXT as environment, the given release and BrowserTracing; nothing else", async () => {
    const { initSentry } = await import("./sentry");
    const env = readEnv({ REACT_APP_SENTRY_ENDPOINT: DSN, REACT_APP_CONTEXT: "production" });
    await expect(initSentry(env, "court@1.0.0")).resolves.toBe(true);
    expect(sdk.loads).toBe(1);
    // Exactly these options: no defaultIntegrations (Sentry adds its default integrations to the list given) and no
    // tracesSampleRate, as the old app.
    expect(sdk.init.mock.calls).toStrictEqual([
      [
        {
          dsn: DSN,
          environment: "production",
          release: "court@1.0.0",
          integrations: [expect.objectContaining({ name: "BrowserTracing" })],
        },
      ],
    ]);
  });

  it("leaves the environment unset when REACT_APP_CONTEXT is not configured", async () => {
    const { initSentry } = await import("./sentry");
    await initSentry(readEnv({ REACT_APP_SENTRY_ENDPOINT: DSN }), "court@1.0.0");
    expect(sdk.init.mock.calls[0]?.[0]?.environment).toBeUndefined();
  });

  it("without a DSN, never loads the SDK and reports nothing", async () => {
    const { initSentry, captureError } = await import("./sentry");
    await expect(initSentry(readEnv({ REACT_APP_CONTEXT: "production" }), "court@1.0.0")).resolves.toBe(false);
    captureError(new Error("render failed"), { componentStack: "\n    at Broken" });
    expect(sdk.loads).toBe(0);
    expect(sdk.init).not.toHaveBeenCalled();
    expect(sdk.captureException).not.toHaveBeenCalled();
  });

  it("reporting before Sentry has started does nothing", async () => {
    const { captureError } = await import("./sentry");
    expect(() => {
      captureError(new Error("too early"));
    }).not.toThrow();
    expect(sdk.loads).toBe(0);
    expect(sdk.captureException).not.toHaveBeenCalled();
  });

  it("once started, reports an error with React's errorInfo keys as extras, as the old error boundary", async () => {
    const { initSentry, captureError } = await import("./sentry");
    await initSentry(readEnv({ REACT_APP_SENTRY_ENDPOINT: DSN }), "court@1.0.0");
    const error = new Error("render failed");
    const errorInfo: ErrorInfo = { componentStack: "\n    at Broken" };
    captureError(error, errorInfo);
    expect(sdk.loads).toBe(1);
    expect(sdk.captureException.mock.calls).toStrictEqual([[error, { extra: { componentStack: "\n    at Broken" } }]]);
  });
});
