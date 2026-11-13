/// <reference types="vitest/config" />
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { pickPublicEnv, readEnv, renderHeaders, renderIndexHtml, type CourtEnv } from "@court/core";
import { runnerPlugin } from "./vite-plugins/runner/index.ts";

const ENV_PREFIX = "REACT_APP_";
/** Same place as today's app: the repository root (never read by tooling here, only by Vite). */
const envDir = fileURLToPath(new URL("../..", import.meta.url));
/** Sentry's release is court@<this> (design D8): the root package.json's version, not a workspace's. */
const { version: ROOT_VERSION } = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  version: string;
};

/**
 * Puts the app's policy (packages/core/src/csp.ts) in dist/_headers and, as a <meta>, in index.html, and refuses a
 * build whose HTML carries inline script. Build only: the dev server needs inline scripts (React refresh).
 */
function securityGuards(env: CourtEnv): Plugin {
  let outDir = "dist";
  return {
    name: "court-security-guards",
    apply: "build",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    transformIndexHtml(html) {
      return renderIndexHtml(html, env);
    },
    closeBundle() {
      const headersPath = resolve(outDir, "_headers");
      writeFileSync(headersPath, renderHeaders(readFileSync(headersPath, "utf8"), env));
      for (const page of ["index.html", "__runner/index.html"]) {
        const html = readFileSync(resolve(outDir, page), "utf8");
        const inline = [...html.matchAll(/<script\b([^>]*)>/gi)].filter((m) => !/\bsrc\s*=/.test(m[1] ?? ""));
        if (inline.length > 0) throw new Error(`${page}: inline <script> found; script-src 'self' forbids it`);
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  // Only the app's own public variables (ENV_KEYS) reach the bundle (design D14). There is deliberately no
  // `envPrefix: "REACT_APP_"`: import.meta.env would then hold every REACT_APP_* variable of the build environment, and
  // any code reading it as a whole object, ours or a dependency's, would put all of them in the bundle.
  const publicEnv = pickPublicEnv(loadEnv(mode, envDir, ENV_PREFIX));
  return {
    envDir,
    plugins: [react(), securityGuards(readEnv(publicEnv)), runnerPlugin()],
    define: {
      __COURT_ENV__: JSON.stringify(publicEnv),
      __COURT_VERSION__: JSON.stringify(ROOT_VERSION),
    },
    build: {
      sourcemap: true,
    },
    test: {
      environment: "jsdom",
      include: ["src/**/*.test.{ts,tsx}"],
      // AppKit loaded as the bundle loads it. Node alone takes @walletconnect/universal-provider's CommonJS build, whose
      // default export has no `init`: AppKit then never started WalletConnect in a unit test.
      server: { deps: { inline: [/\/node_modules\/@reown\/appkit\//] } },
    },
  };
});
