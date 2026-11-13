import path from "node:path";
import { build, type Connect, type Plugin } from "vite";

/** The runner page's entry, relative to the web package root. */
const BOOTSTRAP_ENTRY = "src/runner/page/main.ts";
/** A change under this folder (relative to the web package root) makes the dev server rebuild the bootstrap. */
const RUNNER_SOURCE_DIR = "src/runner";
const RUNNER_DIRECTORY = "/__runner/";
/** The classic script public/__runner/index.html loads. */
const BOOTSTRAP_PATH = "/__runner/bootstrap.js";

/**
 * The runner's own response headers (D-18): an opaque origin however the page is loaded, and only the app may frame it.
 * Revalidated on every load: the runner's file names carry no hash, so a cached old runner would answer a new app in an
 * older message format. public/_headers sends the same headers on the deploy (a unit test compares them); the dev and
 * preview servers send them here, so the runner behaves locally as deployed.
 */
export const RUNNER_HEADERS: Readonly<Record<string, string>> = {
  "Content-Security-Policy":
    "sandbox allow-scripts; frame-ancestors 'self'; script-src 'self' 'unsafe-eval'; object-src 'none'; base-uri 'none'",
  "X-Frame-Options": "SAMEORIGIN",
  "Cache-Control": "no-cache",
};

/**
 * The bootstrap as one classic IIFE, kept in memory: a classic script loads in the opaque-origin runner document, where
 * a module script would be refused (its CORS request carries `Origin: null`). Built alone, so no app code, React or
 * core runtime enters it; no env file is read (envDir false).
 */
export async function buildRunnerBootstrap(root: string): Promise<string> {
  const result = await build({
    configFile: false,
    envDir: false,
    publicDir: false,
    root,
    logLevel: "warn",
    build: {
      write: false,
      emptyOutDir: false,
      copyPublicDir: false,
      sourcemap: false,
      minify: true,
      lib: {
        entry: path.resolve(root, BOOTSTRAP_ENTRY),
        formats: ["iife"],
        name: "courtRunner",
        fileName: () => "bootstrap.js",
      },
    },
  });
  const outputs = Array.isArray(result) ? result : [result];
  const chunks = outputs
    .flatMap((output) => ("output" in output ? output.output : []))
    .filter((item) => item.type === "chunk");
  const [chunk] = chunks;
  if (chunk === undefined || chunks.length !== 1) {
    throw new Error(`The runner bootstrap build produced ${chunks.length} chunks instead of one.`);
  }
  return chunk.code;
}

function pathname(url: string | undefined): string {
  return new URL(url ?? "/", "http://localhost").pathname;
}

const sendRunnerHeaders: Connect.NextHandleFunction = (request, response, next) => {
  if (pathname(request.url).startsWith(RUNNER_DIRECTORY)) {
    for (const [name, value] of Object.entries(RUNNER_HEADERS)) response.setHeader(name, value);
  }
  next();
};

/** Emits /__runner/bootstrap.js into the build, serves it in dev, and sends the runner's headers in dev and preview. */
export function runnerPlugin(): Plugin {
  let root = process.cwd();

  return {
    name: "court:runner",
    configResolved(config) {
      root = config.root;
    },
    async generateBundle() {
      this.emitFile({ type: "asset", fileName: BOOTSTRAP_PATH.slice(1), source: await buildRunnerBootstrap(root) });
    },
    configureServer(server) {
      const sourceDir = path.resolve(server.config.root, RUNNER_SOURCE_DIR);
      let bootstrap: Promise<string> | undefined;
      server.watcher.on("change", (file: string) => {
        if (path.resolve(file).startsWith(sourceDir)) bootstrap = undefined;
      });

      server.middlewares.use(sendRunnerHeaders);
      server.middlewares.use((request, response, next) => {
        if (pathname(request.url) !== BOOTSTRAP_PATH) {
          next();
          return;
        }
        bootstrap ??= buildRunnerBootstrap(server.config.root);
        bootstrap.then(
          (code) => {
            response.setHeader("Content-Type", "text/javascript; charset=utf-8");
            response.end(code);
          },
          (error: unknown) => {
            bootstrap = undefined;
            next(error);
          },
        );
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(sendRunnerHeaders);
    },
  };
}
