import { expect, test, type Frame, type Page } from "@playwright/test";
import { readEnv } from "@court/core";

// Smoke checks of the built app as served (e2e/serve.ts): D-03 (CSP on every path the SPA fallback serves, zero
// violations), no inline script runs, the app is never framed, and D-18 (the runner is an opaque origin only the app
// frames).

/**
 * Which build the run expects, from the run's own environment: CI builds the end-to-end target with a placeholder Reown
 * project id and sets the same variable on this run. With an id, AppKit loads and the header shows Connect
 * (src/wallet/init.ts); without one the app is read-only. A wallet build whose AppKit failed to load falls back to
 * read-only, so it fails here instead of passing the CSP tests without AppKit running.
 */
const WALLET_BUILD = readEnv(process.env).walletConnectProjectId !== undefined;

declare global {
  interface Window {
    cspViolations: string[];
    inlineRan?: boolean;
  }
}

const META = 'meta[http-equiv="Content-Security-Policy"]';

test.beforeEach(async ({ context, baseURL }) => {
  const local = new URL(baseURL ?? "").origin;
  await context.route("**/*", (route) =>
    new URL(route.request().url()).origin === local ? route.continue() : route.abort(),
  );
  await context.addInitScript(() => {
    window.cspViolations = [];
    document.addEventListener("securitypolicyviolation", (e) => {
      window.cspViolations.push(`${e.violatedDirective} ${e.blockedURI} ${e.sourceFile}`);
    });
  });
});

const violations = (page: Page) => page.evaluate(() => window.cspViolations);

// exact: "Connecting…" would also match the name "Connect".
const connectButton = (page: Page) => page.getByRole("button", { name: "Connect", exact: true });

/** Call once the page shows a heading: the app renders only after the wallet setup settled (src/main.tsx). */
async function expectWalletControl(page: Page) {
  if (WALLET_BUILD) await expect(connectButton(page)).toBeVisible();
  else await expect(connectButton(page)).toHaveCount(0);
}

test("/ renders the app; its <meta> policy is the header policy minus frame-ancestors", async ({ page }) => {
  const response = await page.goto("/");
  await expect(page.getByRole("heading", { name: "Kleros Court" })).toBeVisible();
  const header = response?.headers()["content-security-policy"] ?? "";
  expect(header).toContain("; frame-ancestors 'none'");
  expect(await page.locator(META).getAttribute("content")).toBe(header.replace("; frame-ancestors 'none'", ""));
});

for (const path of ["/", "/1/cases/1", "/no/such/page"]) {
  test(`zero CSP violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading")).toBeVisible();
    await expectWalletControl(page);
    await page.waitForLoadState("networkidle");
    expect(await violations(page)).toEqual([]);
  });
}

test("Connect opens AppKit's Connect view, with zero CSP violations", async ({ page }) => {
  test.skip(!WALLET_BUILD, "read-only build: no Connect (checked by the zero-violation tests)");
  await page.goto("/");
  await connectButton(page).click();
  // Reown's hosts are unreachable here, as in the court lab, where the same view opens and connects the mock wallet.
  await expect(page.locator("w3m-modal").getByText("Connect Wallet", { exact: true })).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(await violations(page)).toEqual([]);
});

/**
 * WalletConnect's store in the browser, where its core reads its records when AppKit starts it
 * (@walletconnect/keyvaluestorage: this IndexedDB database and object store; a key's "//" is stored as ":").
 */
const WALLET_CONNECT_DB = "WALLET_CONNECT_V2_INDEXED_DB";
const WALLET_CONNECT_PAIRINGS = "wc@2:core:0.3:pairing";
const WALLET_CONNECT_SESSIONS = "wc@2:client:0.3:session";

/**
 * Writes one record as the library does (JSON text), or reads it back; resolves once the transaction completes. The
 * first write makes the database as the library's store makes it when it opens first (idb-keyval 6.3.0 createStore).
 */
function walletConnectRecord(page: Page, key: string, text?: string) {
  return page.evaluate(
    ({ db, key, text }) =>
      new Promise<unknown>((resolve, reject) => {
        const open = indexedDB.open(db);
        open.onupgradeneeded = () => open.result.createObjectStore("keyvaluestorage");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction("keyvaluestorage", text === undefined ? "readonly" : "readwrite");
          const store = tx.objectStore("keyvaluestorage");
          const request = text === undefined ? store.get(key) : store.put(text, key);
          tx.oncomplete = () => {
            open.result.close();
            resolve(text === undefined ? request.result : undefined);
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    { db: WALLET_CONNECT_DB, key, text },
  );
}

/**
 * Opens a file of the app's origin, where the app does not run, so the records a test leaves are in place before any
 * WalletConnect store opens. Written after a load of the app, they raced that load's WalletConnect start, which could
 * read or rewrite them before the test looked.
 */
async function openOriginWithoutApp(page: Page) {
  const response = await page.goto("/manifest.json");
  // A path with no file is answered by the app (e2e/serve.ts, as netlify.toml): the records would race it again.
  expect(response?.headers()["content-type"]).toBe("application/json");
}

// The boot check (src/wallet/walletConnectValues.ts) only helps if it reads the store WalletConnect itself opens in the
// bundle: unit tests run the Node build of the library. A pairing list that is not a list stopped WalletConnect's start
// on every load (no WalletConnect row, D-01, D-55) until the check removed it.
test("a malformed WalletConnect record left by an earlier visit is removed when the app starts", async ({ page }) => {
  test.skip(!WALLET_BUILD, "read-only build: AppKit and WalletConnect never start");
  await openOriginWithoutApp(page);
  await walletConnectRecord(page, WALLET_CONNECT_PAIRINGS, JSON.stringify("zz"));
  expect(await walletConnectRecord(page, WALLET_CONNECT_PAIRINGS)).toBe('"zz"');
  await page.goto("/");
  // The app renders after the check (src/wallet/init.ts; it answers in milliseconds, bounded at 2 s).
  await expect(connectButton(page)).toBeVisible();
  expect(await walletConnectRecord(page, WALLET_CONNECT_PAIRINGS)).toBeUndefined();
});

// A WalletConnect session saved in a form its start cannot read (here its namespaces are null; another build of this
// app can leave one) stopped WalletConnect's start on every load: AppKit kept the failure and the Connect window had no
// WalletConnect row (D-01, D-55). The app starts WalletConnect itself, forgets its saved data when the start fails and
// starts it again (src/wallet/walletConnectRecovery.ts), so the row is there in the same load.
test("WalletConnect starts again without saved data it cannot read, and its row is offered in the same load", async ({
  page,
}) => {
  test.skip(!WALLET_BUILD, "read-only build: AppKit and WalletConnect never start");
  const topic = "b".repeat(64);
  const metadata = { name: "x", description: "x", url: "https://x.example", icons: [] };
  const session = {
    topic,
    relay: { protocol: "irn" },
    expiry: 4102444800,
    namespaces: null,
    acknowledged: true,
    pairingTopic: "a".repeat(64),
    requiredNamespaces: {},
    optionalNamespaces: {},
    controller: "5".repeat(64),
    self: { publicKey: "2".repeat(64), metadata },
    peer: { publicKey: "5".repeat(64), metadata },
    transportType: "relay",
  };
  // With its topic key: WalletConnect drops a saved session it has no key for before reading it.
  const keychain = JSON.stringify({ [topic]: "1".repeat(64) });
  await openOriginWithoutApp(page);
  await walletConnectRecord(page, "wc@2:core:0.3:keychain", keychain);
  await walletConnectRecord(page, WALLET_CONNECT_SESSIONS, JSON.stringify([session]));
  expect(await walletConnectRecord(page, "wc@2:core:0.3:keychain")).toBe(keychain);
  expect(await walletConnectRecord(page, WALLET_CONNECT_SESSIONS)).toBe(JSON.stringify([session]));
  const messages: string[] = [];
  page.on("console", (m) => messages.push(m.text()));
  await page.goto("/");
  await expect(connectButton(page)).toBeVisible();
  await connectButton(page).click();
  await expect(page.locator("w3m-modal").getByText("WalletConnect", { exact: true }).first()).toBeVisible();
  // The row alone also shows when the start never read the session: the app's warning says the start failed on it and
  // ran again (src/wallet/walletConnectRecovery.ts).
  await expect
    .poll(() => messages.some((m) => m.startsWith("WalletConnect could not start from its saved data")))
    .toBe(true);
  expect(await walletConnectRecord(page, WALLET_CONNECT_SESSIONS)).toBeUndefined();
});

test("an unknown deep path renders Page not found under the <meta> policy: an inline script is blocked", async ({
  page,
}) => {
  const response = await page.goto("/no/such/page");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  // No _headers rule lists this path, so the <meta> is the policy that applies here.
  expect(response?.headers()["content-security-policy"]).toBeUndefined();
  await expect(page.locator(META)).toHaveCount(1);
  const ran = await page.evaluate(async () => {
    const script = document.createElement("script");
    script.textContent = "window.inlineRan = true;";
    document.head.append(script);
    await new Promise((resolve) => setTimeout(resolve, 200));
    return window.inlineRan === true;
  });
  expect(ran).toBe(false);
  expect(await violations(page)).toEqual([expect.stringMatching(/^script-src-elem inline /)]);
});

/** Chromium replaces a refused frame's document with its error page, and says why in the console. */
const frameState = (frame: Frame) =>
  frame.evaluate(() => ({ href: location.href, rootChildren: document.getElementById("root")?.childElementCount }));

test("framed by another page: / is refused, an unknown deep path is refused or stays empty", async ({
  page,
  baseURL,
}) => {
  const messages: string[] = [];
  page.on("console", (m) => messages.push(m.text()));
  await page.setContent(
    `<iframe src="${baseURL ?? ""}/"></iframe><iframe src="${baseURL ?? ""}/no/such/page"></iframe>`,
  );
  const [root, deep] = page.mainFrame().childFrames();
  if (root === undefined || deep === undefined) throw new Error("two frames expected");
  // An error page alone could also be a failed load: the refusal must be named.
  expect((await frameState(root)).href).toMatch(/^chrome-error:/);
  expect(messages.some((m) => m.includes("frame-ancestors 'none'"))).toBe(true);
  const deepState = await frameState(deep);
  if (!deepState.href.startsWith("chrome-error:")) {
    // src/framing.ts stopped the app before it rendered anything
    await expect.poll(() => messages.some((m) => m.includes("does not run inside a frame"))).toBe(true);
    expect(deepState.rootChildren).toBe(0);
  }
});

test("the app frames the script runner: it loads with origin null", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Kleros Court" })).toBeVisible();
  await page.evaluate(() => {
    const frame = document.createElement("iframe");
    frame.name = "runner";
    frame.src = "/__runner/";
    document.body.append(frame);
  });
  await expect.poll(() => page.frame({ name: "runner" })?.url()).toMatch(/\/__runner\/$/);
  const runner = page.frame({ name: "runner" });
  if (runner === null) throw new Error("runner frame missing");
  await runner.waitForLoadState();
  // No sandbox attribute on the frame: the opaque origin comes from the runner's own header (sandbox allow-scripts).
  expect(await runner.evaluate(() => ({ origin: self.origin, title: document.title }))).toEqual({
    origin: "null",
    title: "Kleros Court script runner",
  });
  expect(await runner.locator(META).count()).toBe(0);
  expect(await violations(page)).toEqual([]);
});

test("the runner's files are revalidated on every load: a deploy never leaves an old runner in the cache", async ({
  request,
}) => {
  for (const path of ["/__runner/index.html", "/__runner/bootstrap.js"]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()["cache-control"], path).toBe("no-cache");
  }
});
