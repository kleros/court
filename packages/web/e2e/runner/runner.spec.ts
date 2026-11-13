import { createRequire } from "node:module";
import { expect, test, type Browser, type BrowserType, type LaunchOptions, type Page } from "@playwright/test";

// The dynamic-script runner as built and served (e2e/serve.ts: dist/ with its own _headers rules), D-18: an opaque
// origin, framed only by the app, one run per frame through a transferred port. The host is written here, on the app's
// own page, the way the app frames the runner, so no test build is needed. Guard tests that strip the runner's headers
// do so as a broken deploy would, to prove the page's own checks.

const RUNNER_PATH = "/__runner/index.html";
const BOOTSTRAP_PATH = "/__runner/bootstrap.js";
const RUNNER_POLICY =
  "sandbox allow-scripts; frame-ancestors 'self'; script-src 'self' 'unsafe-eval'; object-src 'none'; base-uri 'none'";

/** A page on another site, served by a test route (its name does not resolve: playwright.config.ts). */
const FOREIGN_PAGE = "http://foreign-parent.test/host.html";
// A route-served page has no network address, so Chromium's local network access checks would stop it from framing the
// loopback server, and a foreign-parent test would pass without the runner page ever loading. Those tests run in a
// browser with the checks off and assert what loaded.
const WITHOUT_LOCAL_NETWORK_CHECKS = "--disable-features=LocalNetworkAccessChecks";

/** How long a guard test waits for a reply that must never come. */
const SILENCE_MS = 2_000;

/**
 * How long the host waits, after a reply, for the probe's window signal. The signal and the port reply travel on
 * different channels with no guaranteed order: in the lab run of the wave-1 gate the signal landed about 10 ms after
 * the reply.
 */
const SIGNAL_WAIT_MS = 2_000;

/** Today's parameter forms (design D9): decimal id, checksummed arbitrable address, chain ids as numbers. */
const PARAMS = {
  disputeID: "1650",
  arbitrableContractAddress: "0x2018038203aEE8e7a29dABd73771b0355D4F85ad",
  arbitratorChainID: 1,
  arbitrableChainID: 1,
  arbitratorJsonRpcUrl: "https://rpc.invalid/mainnet",
  arbitrableJsonRpcUrl: "https://rpc.invalid/mainnet",
};

// Probes what a script can reach from inside the runner: its origin, its own and its parent's storage, its parent's
// document, the document's charset and a literal non-ASCII delimiter. It also signals the parent window directly, so a
// guard test sees any evaluation even when no port reply arrives.
const PROBE_SCRIPT = `
window.parent.postMessage("evaluated", "*");
var getMetaEvidence = function () {
  function attempt(read) { try { return read(); } catch (error) { return "blocked:" + error.name; } }
  resolveScript({
    origin: self.origin,
    ownStorage: attempt(function () { return typeof window.localStorage.getItem("court-e2e"); }),
    parentStorage: attempt(function () { return window.parent.localStorage.getItem("court-e2e"); }),
    parentDocument: attempt(function () { return window.parent.document.title; }),
    charset: document.characterSet,
    delimiterParts: "Harris␟Trump".split("␟"),
    disputeID: scriptParameters.disputeID,
  });
};`;

const ACCEPTED = { type: "court-runner/accepted" };
const PROBE_RESULT = {
  type: "court-runner/result",
  value: {
    origin: "null",
    ownStorage: "blocked:SecurityError",
    parentStorage: "blocked:SecurityError",
    parentDocument: "blocked:SecurityError",
    charset: "UTF-8",
    delimiterParts: ["Harris", "Trump"],
    disputeID: "1650",
  },
  jsonDuplicateKeys: false,
};

/**
 * The old app's duplicate-key guard, as it ships today (P41 keep). Loaded through Node's require: an import of the old
 * app's plain JavaScript would make TypeScript ask for type declarations it does not have.
 */
function loadLegacyDuplicateKeyGuard(): string {
  const guardModule: unknown = createRequire(import.meta.url)(
    "../../../../legacy/src/temp/json-duplicate-key-guard.js",
  );
  const source: unknown =
    typeof guardModule === "object" && guardModule !== null
      ? Reflect.get(guardModule, "JSON_DUPLICATE_KEY_GUARD")
      : undefined;
  if (typeof source !== "string") throw new Error("The old app's guard module exports no JSON_DUPLICATE_KEY_GUARD.");
  return source;
}

interface RunInput {
  readonly scriptText: string;
  readonly runnerUrl: string;
  readonly sandbox: boolean;
  readonly waitMs: number;
  /** The guard the page evaluates before the script; none when left out. */
  readonly guardSource?: string;
}

interface RunOutput {
  /** Every message the port carried, in order, until the run returned (so also any that came after the reply). */
  readonly messages: unknown[];
  /** The first message that is not the acknowledgement, or `null` when none came within the wait. */
  readonly reply: unknown;
  /** Whether the runner frame signalled the window: by the end of the wait, or up to SIGNAL_WAIT_MS after a reply. */
  readonly evaluatedSignal: boolean;
}

/** The app's way: a frame (sandbox="allow-scripts" unless told otherwise), one run message posted with one port. */
async function runInRunner(page: Page, input: RunInput): Promise<RunOutput> {
  return page.evaluate(
    async ({ scriptText, runnerUrl, sandbox, waitMs, guardSource, signalWaitMs, params }) => {
      const frame = document.createElement("iframe");
      if (sandbox) frame.setAttribute("sandbox", "allow-scripts");
      frame.src = runnerUrl;
      let evaluatedSignal = false;
      // The probe signals from the runner frame: "null" when sandboxed, the runner URL's origin when not.
      const runnerOrigins = new Set(["null", new URL(runnerUrl, location.href).origin]);
      window.addEventListener("message", (event) => {
        if (runnerOrigins.has(event.origin) && event.data === "evaluated") evaluatedSignal = true;
      });
      await new Promise<void>((resolve) => {
        frame.addEventListener("load", () => {
          resolve();
        });
        document.body.append(frame);
      });
      const channel = new MessageChannel();
      const messages: unknown[] = [];
      const reply = new Promise<unknown>((resolve) => {
        channel.port1.onmessage = (event: MessageEvent<unknown>) => {
          const data = event.data;
          messages.push(data);
          const type = typeof data === "object" && data !== null ? Reflect.get(data, "type") : undefined;
          // As the app's host does: the page evaluates only after this start signal.
          if (type === "court-runner/accepted") channel.port1.postMessage({ type: "court-runner/start" });
          else resolve(data);
        };
        setTimeout(() => {
          resolve(null);
        }, waitMs);
      });
      frame.contentWindow?.postMessage(
        { type: "court-runner/run", version: 2, scriptText, params, guardSource, rpcRedirects: [] },
        "*",
        [channel.port2],
      );
      const result = await reply;
      // The signal may trail the reply (SIGNAL_WAIT_MS); with no reply the whole wait has already passed.
      const signalWaitStart = performance.now();
      while (result !== null && !evaluatedSignal && performance.now() - signalWaitStart < signalWaitMs) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      return { reply: result, messages: [...messages], evaluatedSignal };
    },
    { ...input, guardSource: input.guardSource ?? null, signalWaitMs: SIGNAL_WAIT_MS, params: PARAMS },
  );
}

/** Whether the runner's bootstrap was served to the page (so a refusal came from its own checks, not a failed load). */
function trackBootstrap(page: Page): () => { readonly served: boolean; readonly failed: boolean } {
  let served = false;
  let failed = false;
  page.on("requestfinished", (request) => {
    if (new URL(request.url()).pathname === BOOTSTRAP_PATH) served = true;
  });
  page.on("requestfailed", (request) => {
    if (new URL(request.url()).pathname === BOOTSTRAP_PATH) failed = true;
  });
  return () => ({ served, failed });
}

/** Not even an acknowledgement: a refused request learns nothing, and the frame defines no script globals. */
async function expectNothingEvaluated(page: Page, run: RunOutput): Promise<void> {
  expect(run.messages).toEqual([]);
  expect(run.reply).toBeNull();
  expect(run.evaluatedSignal).toBe(false);
  const runner = page.frames().find((frame) => frame.url().endsWith(RUNNER_PATH));
  expect(runner).toBeDefined();
  expect(await runner?.evaluate(() => typeof Reflect.get(globalThis, "scriptParameters"))).toBe("undefined");
}

/** As a broken deploy would serve it: the runner page without its sandbox policy and framing header. */
async function stripRunnerHeaders(page: Page): Promise<void> {
  await page.route(`**${RUNNER_PATH}`, async (route) => {
    const response = await route.fetch();
    const headers = Object.fromEntries(
      Object.entries(response.headers()).filter(
        ([name]) => !["content-security-policy", "x-frame-options"].includes(name.toLowerCase()),
      ),
    );
    await route.fulfill({ response, headers });
  });
}

async function launchWithoutLocalNetworkChecks(engine: BrowserType, launchOptions: LaunchOptions): Promise<Browser> {
  if (engine.name() !== "chromium") return engine.launch(launchOptions);
  return engine.launch({ ...launchOptions, args: [...(launchOptions.args ?? []), WITHOUT_LOCAL_NETWORK_CHECKS] });
}

async function serveForeignPage(page: Page, body: string): Promise<void> {
  await page.route(FOREIGN_PAGE, (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Other site</title></head><body>${body}</body></html>`,
    }),
  );
}

test.describe("script runner page", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    const local = new URL(baseURL ?? "").origin;
    await context.route("**/*", (route) =>
      new URL(route.request().url()).origin === local ? route.continue() : route.abort(),
    );
  });

  test("the runner page and its bootstrap carry the runner's own policy; the page loads only the bootstrap", async ({
    request,
  }) => {
    const page = await request.get(RUNNER_PATH);
    expect(page.headers()["content-security-policy"]).toBe(RUNNER_POLICY);
    expect(page.headers()["x-frame-options"]).toBe("SAMEORIGIN");
    expect(await page.text()).toContain(`<script src="${BOOTSTRAP_PATH}"></script>`);
    const bootstrap = await request.get(BOOTSTRAP_PATH);
    expect(bootstrap.ok()).toBe(true);
    expect(bootstrap.headers()["content-security-policy"]).toBe(RUNNER_POLICY);
    expect(bootstrap.headers()["content-type"]).toMatch(/^text\/javascript/);
  });

  test("framed by the app, the runner runs a script at an opaque origin, in UTF-8, and acknowledges before it replies", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Kleros Court" })).toBeVisible();
    await page.evaluate(() => {
      window.localStorage.setItem("court-e2e", "app secret");
    });

    const run = await runInRunner(page, {
      scriptText: PROBE_SCRIPT,
      runnerUrl: RUNNER_PATH,
      sandbox: true,
      waitMs: 15_000,
    });

    expect(run.messages).toEqual([ACCEPTED, PROBE_RESULT]);
    expect(run.evaluatedSignal).toBe(true);
  });

  test("a script that rejects, or whose async entry point fails, reports it at once", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Kleros Court" })).toBeVisible();
    const cases = [
      ['var getMetaEvidence = function () { rejectScript(new Error("no question")); };', "no question"],
      ['var getMetaEvidence = async function () { await null; throw new Error("late failure"); };', "late failure"],
    ] as const;
    for (const [scriptText, message] of cases) {
      const run = await runInRunner(page, { scriptText, runnerUrl: RUNNER_PATH, sandbox: true, waitMs: 4_000 });
      expect(run.messages).toEqual([ACCEPTED, { type: "court-runner/error", message, jsonDuplicateKeys: false }]);
    }
  });

  test("with the old app's duplicate-key guard, a script that catches its throw still resolves and the reply says a key repeated (P41 keep)", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Kleros Court" })).toBeVisible();
    const scriptText = `var getMetaEvidence = function () {
      var parsed;
      try { parsed = JSON.parse('{"type":"bool","type":"single-select"}'); } catch (error) { parsed = error.message; }
      resolveScript({ parsed: parsed });
    };`;
    const run = { scriptText, runnerUrl: RUNNER_PATH, sandbox: true, waitMs: 4_000 };

    const guarded = await runInRunner(page, { ...run, guardSource: loadLegacyDuplicateKeyGuard() });
    const unguarded = await runInRunner(page, run);

    expect(guarded.messages).toEqual([
      ACCEPTED,
      { type: "court-runner/result", value: { parsed: "Duplicate keys in JSON document" }, jsonDuplicateKeys: true },
    ]);
    // The control: without a guard the page's own JSON.parse keeps the last key, and nothing sets the flag.
    expect(unguarded.messages).toEqual([
      ACCEPTED,
      { type: "court-runner/result", value: { parsed: { type: "single-select" } }, jsonDuplicateKeys: false },
    ]);
  });

  test("opened as the top-level page, the runner evaluates nothing", async ({ page }) => {
    const bootstrap = trackBootstrap(page);
    await page.goto(RUNNER_PATH);
    const evaluated = await page.evaluate(
      async ({ params, waitMs }) => {
        // Every message on the port for the whole wait: a refused request gets none, not even an acknowledgement.
        const channel = new MessageChannel();
        const messages: unknown[] = [];
        channel.port1.onmessage = (event: MessageEvent<unknown>) => {
          messages.push(event.data);
        };
        const scriptText = "var getMetaEvidence = function () { resolveScript({}); };";
        window.postMessage(
          { type: "court-runner/run", version: 2, scriptText, params, guardSource: null, rpcRedirects: [] },
          "*",
          [channel.port2],
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        return { messages, scriptParameters: typeof Reflect.get(globalThis, "scriptParameters") };
      },
      { params: PARAMS, waitMs: SILENCE_MS },
    );
    expect(evaluated).toEqual({ messages: [], scriptParameters: "undefined" });
    expect(bootstrap()).toEqual({ served: true, failed: false });
  });

  test("framed without its sandbox attribute and without its headers (a broken deploy), the runner evaluates nothing", async ({
    page,
  }) => {
    const bootstrap = trackBootstrap(page);
    await stripRunnerHeaders(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Kleros Court" })).toBeVisible();

    const run = await runInRunner(page, {
      scriptText: PROBE_SCRIPT,
      runnerUrl: RUNNER_PATH,
      sandbox: false,
      waitMs: SILENCE_MS,
    });

    await expectNothingEvaluated(page, run);
    expect(bootstrap()).toEqual({ served: true, failed: false });
  });
});

test.describe("script runner framed by another site", () => {
  test("its policy refuses the frame: the runner page never loads", async ({
    playwright,
    browserName,
    launchOptions,
    baseURL,
  }) => {
    const browser = await launchWithoutLocalNetworkChecks(playwright[browserName], launchOptions);
    try {
      const page = await browser.newPage();
      const messages: string[] = [];
      page.on("console", (message) => messages.push(message.text()));
      const bootstrap = trackBootstrap(page);
      await serveForeignPage(
        page,
        `<iframe name="runner" sandbox="allow-scripts" src="${baseURL ?? ""}${RUNNER_PATH}"></iframe>`,
      );
      await page.goto(FOREIGN_PAGE);
      await expect.poll(() => messages.some((message) => message.includes("frame-ancestors 'self'"))).toBe(true);
      expect(bootstrap()).toEqual({ served: false, failed: false });
    } finally {
      await browser.close();
    }
  });

  test("with the runner's headers stripped, its own checks still evaluate nothing", async ({
    playwright,
    browserName,
    launchOptions,
    baseURL,
  }) => {
    const browser = await launchWithoutLocalNetworkChecks(playwright[browserName], launchOptions);
    try {
      const page = await browser.newPage();
      const bootstrap = trackBootstrap(page);
      await stripRunnerHeaders(page);
      await serveForeignPage(page, "");
      await page.goto(FOREIGN_PAGE);

      const run = await runInRunner(page, {
        scriptText: PROBE_SCRIPT,
        runnerUrl: `${baseURL ?? ""}${RUNNER_PATH}`,
        sandbox: true,
        waitMs: SILENCE_MS,
      });

      await expectNothingEvaluated(page, run);
      expect(bootstrap()).toEqual({ served: true, failed: false });
    } finally {
      await browser.close();
    }
  });
});
