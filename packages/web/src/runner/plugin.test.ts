// @vitest-environment node
import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";
import type { Connect } from "vite";
import { beforeAll, describe, expect, it } from "vitest";
import { headersFor, parseHeaders } from "../../e2e/netlify-headers.ts";
import { RUNNER_HEADERS, buildRunnerBootstrap, runnerPlugin } from "../../vite-plugins/runner/index.ts";

const webRoot = fileURLToPath(new URL("../..", import.meta.url));

type Hook = (...args: unknown[]) => unknown;

function hookHandler(hook: unknown): Hook {
  if (typeof hook !== "function") throw new Error("The plugin does not declare this hook as a function.");
  return hook as Hook;
}

/**
 * Sends one request through the middlewares a server hook installed: the headers set on the response, and the body it
 * ended with (`undefined` when every middleware passed it on).
 */
function respond(
  middlewares: Connect.NextHandleFunction[],
  url: string,
): Promise<{ readonly headers: Record<string, string>; readonly body: unknown }> {
  const headers: Record<string, string> = {};
  return new Promise((resolve) => {
    const response = {
      setHeader(name: string, value: string) {
        headers[name.toLowerCase()] = value;
      },
      end(body: unknown) {
        resolve({ headers, body });
      },
    };
    const runFrom = (index: number): void => {
      const middleware = middlewares[index];
      if (middleware === undefined) {
        resolve({ headers, body: undefined });
        return;
      }
      middleware({ url } as Connect.IncomingMessage, response as never, () => {
        runFrom(index + 1);
      });
    };
    runFrom(0);
  });
}

const lowercased = (headers: Readonly<Record<string, string>>) =>
  Object.fromEntries(Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]));

describe("runner bootstrap build", () => {
  let bootstrap = "";

  beforeAll(async () => {
    bootstrap = await buildRunnerBootstrap(webRoot);
  }, 60_000);

  it("is one classic script, without module syntax", () => {
    expect(bootstrap).not.toMatch(/\bimport\s*[{*\w(]|\bexport\s*[{*\w]|\brequire\(|import\.meta/);
    // Compiled, not run: a classic script refuses import/export at parse time.
    expect(() => new Script(bootstrap)).not.toThrow();
  });

  it("carries the court runner protocol, version 2", () => {
    for (const type of [
      "court-runner/run",
      "court-runner/accepted",
      "court-runner/start",
      "court-runner/result",
      "court-runner/error",
    ]) {
      expect(bootstrap).toContain(type);
    }
    expect(bootstrap).toMatch(/[!=]==?\s*2\b/);
  });

  it("bundles no app code: no React, no core, no environment names, one eval", () => {
    expect(bootstrap).not.toMatch(/react|@court\/|REACT_APP_|viem/i);
    expect(bootstrap.match(/\beval\b/g)).toHaveLength(1);
  });

  it("is pure ASCII, so the page's charset can never garble it", () => {
    expect(Array.from(bootstrap).filter((character) => (character.codePointAt(0) ?? 0) > 0x7e)).toEqual([]);
  });

  it("the app build emits the same bootstrap at the path the runner page loads", async () => {
    const plugin = runnerPlugin();
    hookHandler(plugin.configResolved)({ root: webRoot });
    const emitted: unknown[] = [];
    const context = {
      emitFile(file: unknown) {
        emitted.push(file);
        return "reference";
      },
    };
    await hookHandler(plugin.generateBundle).call(context);
    expect(emitted).toEqual([{ type: "asset", fileName: "__runner/bootstrap.js", source: bootstrap }]);
  }, 60_000);

  function devMiddlewares(): Connect.NextHandleFunction[] {
    const middlewares: Connect.NextHandleFunction[] = [];
    const server = {
      config: { root: webRoot },
      watcher: new EventEmitter(),
      middlewares: { use: (middleware: Connect.NextHandleFunction) => middlewares.push(middleware) },
    };
    hookHandler(runnerPlugin().configureServer)(server);
    return middlewares;
  }

  it("vite dev serves the same bootstrap from memory, with the runner's headers", async () => {
    const { headers, body } = await respond(devMiddlewares(), "/__runner/bootstrap.js");

    expect(body).toBe(bootstrap);
    expect(headers["content-type"]).toBe("text/javascript; charset=utf-8");
    expect(headers).toMatchObject(lowercased(RUNNER_HEADERS));
  }, 60_000);

  it("vite dev has the bootstrap revalidated on every load, as on the deploy", async () => {
    expect((await respond(devMiddlewares(), "/__runner/bootstrap.js")).headers["cache-control"]).toBe("no-cache");
  }, 60_000);
});

describe("runner headers on the preview server", () => {
  function previewMiddlewares(): Connect.NextHandleFunction[] {
    const middlewares: Connect.NextHandleFunction[] = [];
    const server = { middlewares: { use: (middleware: Connect.NextHandleFunction) => middlewares.push(middleware) } };
    hookHandler(runnerPlugin().configurePreviewServer)(server);
    return middlewares;
  }

  it("every runner file gets the runner's own enforced sandbox policy", async () => {
    for (const url of ["/__runner/index.html", "/__runner/bootstrap.js", "/__runner/index.html?x=1", "/__runner/"]) {
      expect((await respond(previewMiddlewares(), url)).headers).toEqual(lowercased(RUNNER_HEADERS));
    }
  });

  it("every runner file is revalidated on every load, as on the deploy: a new app never meets an old cached runner", async () => {
    for (const url of ["/__runner/index.html", "/__runner/bootstrap.js", "/__runner/"]) {
      expect((await respond(previewMiddlewares(), url)).headers["cache-control"], url).toBe("no-cache");
    }
  });

  it("no app path gets them", async () => {
    for (const url of ["/", "/1/cases/1650", "/__runner", "/assets/index.js"]) {
      expect((await respond(previewMiddlewares(), url)).headers).toEqual({});
    }
  });

  it("the deploy's runner rule (public/_headers) sends exactly the headers the dev and preview servers send", () => {
    const rules = parseHeaders(readFileSync(new URL("../../public/_headers", import.meta.url), "utf8"));
    const runnerRules = rules.filter((rule) => rule.pattern === "/__runner/*");
    expect(runnerRules).toHaveLength(1);
    expect(Object.fromEntries(runnerRules[0]?.headers ?? [])).toEqual(lowercased(RUNNER_HEADERS));
    expect(headersFor(rules, "/__runner/index.html").conflicts).toEqual([]);
  });
});

// The runner page's own markup is checked in runnerPage.test.ts, with an HTML parser (this file runs under node).
