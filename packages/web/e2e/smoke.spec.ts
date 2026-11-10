import { expect, test, type Frame, type Page } from "@playwright/test";
import { readEnv } from "@court/core";

// Smoke checks of the built app as served (e2e/serve.ts): D-03 (CSP on every path the SPA fallback serves, zero
// violations), 03 DR-1 (no inline script runs), DR-2 (never framed) and D-18 (the runner is an opaque origin only the app
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
