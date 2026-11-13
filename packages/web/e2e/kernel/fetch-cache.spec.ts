import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import type { FetchRequest } from "@court/core";
import { CUT, FILE, startCutServers, type CutServers } from "./cut-servers.ts";

// Design §25.5: a browser can hand over a cut download as a complete answer, and its HTTP cache can keep that copy
// (the gateway marks files immutable for a year), so a later download in the default mode gets the same cut bytes.
// The kernel's fetcher asks for cache mode "reload" when the request says so. These tests run the kernel's own fetcher
// in real engines against a server that cuts only the first answer. Persistent profiles: a fresh WebKit context has no
// HTTP cache for fetch, so a test there would pass without proving anything. No request routes either: Playwright
// turns the HTTP cache off while routing.

declare global {
  interface Window {
    kernelFetch(request: Pick<FetchRequest, "url" | "cache">): Promise<Fetched>;
  }
}

type Fetched =
  | { readonly ok: true; readonly status: number; readonly text: string }
  | { readonly ok: false; readonly failure: unknown };

const KERNEL_DIR = fileURLToPath(new URL("../../../core/src/kernel/", import.meta.url));

/** The probe that measured these engine facts left about 300 ms between downloads, for the cache write to land. */
const GAP_MS = 300;

/** Request headers that would ask the server for part of the file or let it answer "not modified". */
const PARTIAL_OR_CONDITIONAL = ["range", "if-range", "if-none-match", "if-modified-since"];

const ENGINES = [
  // HTTP/1.1, Content-Length, Connection: close, cut by a TCP FIN: WebKit returns the cut as complete and serves the
  // same cut copy again from its cache.
  { name: "webkit", protocol: "http/1.1", servesCutCopyAgain: true },
  // An HTTP/2 stream ended early without an error: Chromium and Firefox return the cut as complete; their default mode
  // then asks the server again (Chromium for the rest with a Range request, Firefox for the whole file).
  { name: "chromium", protocol: "h2", servesCutCopyAgain: false },
  { name: "firefox", protocol: "h2", servesCutCopyAgain: false },
] as const;

let servers: CutServers;

test.beforeAll(async () => {
  servers = await startCutServers(KERNEL_DIR);
});

test.afterAll(() => {
  servers.close();
});

const kernelFetch = (page: Page, request: Pick<FetchRequest, "url" | "cache">): Promise<Fetched> =>
  page.evaluate((request) => window.kernelFetch(request), request);

for (const engine of ENGINES) {
  test(`${engine.name}: a download in cache mode reload replaces a cut copy the first download left`, async ({
    playwright,
    launchOptions,
  }, testInfo) => {
    // Chromium trusts the test certificate by its public key, the way the engine facts were measured; the others
    // ignore certificate errors, as they were measured. The config's launch options reach every engine launched here,
    // and their arguments are Chromium's (WebKit refuses to start with them), so the others get none.
    const context = await playwright[engine.name].launchPersistentContext(
      testInfo.outputPath("profile"),
      engine.name === "chromium"
        ? {
            headless: true,
            args: [...(launchOptions.args ?? []), `--ignore-certificate-errors-spki-list=${servers.spki}`],
          }
        : { headless: true, ignoreHTTPSErrors: true, args: [] },
    );
    try {
      const page = context.pages()[0] ?? (await context.newPage());
      await page.goto(servers.pageUrl);
      await page.waitForFunction(() => "kernelFetch" in window);
      // A path of its own: the server cuts only a path's first answer.
      const path = `/${engine.name}/${randomUUID()}/case-file.json`;
      const origin = engine.protocol === "h2" ? servers.http2Origin : servers.http1Origin;
      const url = `${origin}${path}`;
      const requests = () => servers.requests.filter((request) => request.path === path);
      const cut = { ok: true, status: 200, text: FILE.slice(0, CUT) };
      const whole = { ok: true, status: 200, text: FILE };

      // The engine hands the cut over as a complete answer: without that, nothing below proves anything.
      expect(await kernelFetch(page, { url })).toEqual(cut);
      expect(requests()).toHaveLength(1);

      if (engine.servesCutCopyAgain) {
        // The engine fact behind the change: a default-mode download gets the cut copy from the cache, no request.
        await page.waitForTimeout(GAP_MS); // NOSONAR
        expect(await kernelFetch(page, { url })).toEqual(cut);
        expect(requests()).toHaveLength(1);
      }

      await page.waitForTimeout(GAP_MS); // NOSONAR
      expect(await kernelFetch(page, { url, cache: "reload" })).toEqual(whole);
      // One more request, a plain GET: no preflight (the gateway's allow list has no Cache-Control or Pragma), and no
      // Range or validator, so the server sends the whole file. Cache-Control: no-cache is the engine's own mark of a
      // reload (the fetcher adds no header), and it brings no preflight with it.
      expect(requests().map((request) => request.method)).toEqual(["GET", "GET"]);
      const reload = requests()[1]?.headers ?? {};
      expect(reload["cache-control"]).toBe("no-cache");
      expect(PARTIAL_OR_CONDITIONAL.filter((name) => name in reload)).toEqual([]);

      await page.waitForTimeout(GAP_MS); // NOSONAR
      expect(await kernelFetch(page, { url })).toEqual(whole);
      // Where the cut copy was served again, the reload replaced it: the whole file now comes from the cache.
      if (engine.servesCutCopyAgain) expect(requests()).toHaveLength(2);
    } finally {
      await context.close();
    }
  });
}
