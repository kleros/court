/// <reference types="vitest/config" />
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readEnv, renderHeaders } from "@court/core";

const ENV_PREFIX = "REACT_APP_";
/** Same place as today's app: the repository root (never read by tooling here, only by Vite). */
const envDir = fileURLToPath(new URL("../..", import.meta.url));

/** Fills connect-src in dist/_headers from the configured hosts, and refuses a build whose HTML carries inline script. */
function securityGuards(mode: string): Plugin {
  let outDir = "dist";
  return {
    name: "court-security-guards",
    apply: "build",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const env = readEnv(loadEnv(mode, envDir, ENV_PREFIX));
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

export default defineConfig(({ mode }) => ({
  envDir,
  envPrefix: ENV_PREFIX,
  plugins: [react(), securityGuards(mode)],
  build: {
    sourcemap: true,
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
  },
}));
