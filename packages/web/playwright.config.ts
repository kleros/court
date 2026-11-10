import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end smoke tests (ADR 0002) on the production build: run `yarn build` first; e2e/serve.ts serves dist/ with its
 * own _headers rules. Chromium, headless. Nothing outside the local server should be reachable: the specs abort every
 * other request, and the host resolver rules below make every name but 127.0.0.1 unresolvable, a second guard for
 * traffic routes do not see (such as WebSockets; not exercised by these tests).
 */
const PORT = 4319;

export default defineConfig({
  testDir: "e2e",
  forbidOnly: Boolean(process.env.CI),
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://127.0.0.1:${String(PORT)}`,
    launchOptions: { args: ["--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1"] },
  },
  webServer: {
    command: `node e2e/serve.ts ${String(PORT)}`,
    url: `http://127.0.0.1:${String(PORT)}/`,
    reuseExistingServer: false,
  },
});
