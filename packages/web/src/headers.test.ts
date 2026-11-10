// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ENV_KEYS, readEnv, renderHeaders, renderIndexHtml } from "@court/core";
import { headersFor as headersOf, parseHeaders } from "../e2e/netlify-headers.ts";

const env = readEnv({ REACT_APP_WALLETCONNECT_PROJECT_ID: "id" });
const template = readFileSync(new URL("../public/_headers", import.meta.url), "utf8");
const rendered = renderHeaders(template, env);

const rules = parseHeaders(rendered);
const headersFor = (path: string) => headersOf(rules, path);

/** Request paths the app answers: pages, the root files (favicon, manifest, snapshots), built assets. */
const APP_REQUESTS = [
  "/",
  "/index.html",
  "/favicon.ico",
  "/manifest.json",
  "/snapshots.json",
  "/1/cases/1684",
  "/100/cases/1",
  "/10200/cases/1",
  "/11155111/cases/1",
  "/cases/1684",
  "/assets/index-AbC123.js",
  "/assets/index-AbC123.css",
  "/assets/logo-AbC123.svg",
];
const RUNNER_REQUESTS = ["/__runner/", "/__runner/index.html"];

describe("_headers", () => {
  it("strict policy + DENY on every app request path, one rule each, identical everywhere", () => {
    const first = headersFor("/").headers.get("content-security-policy");
    for (const path of APP_REQUESTS) {
      const { headers, conflicts } = headersFor(path);
      expect(conflicts, path).toEqual([]);
      const policy = headers.get("content-security-policy");
      expect(policy, path).toBe(first);
      expect(policy).toContain("script-src 'self';");
      expect(policy).toContain("style-src 'self' 'unsafe-inline';");
      expect(policy).toContain("frame-ancestors 'none'");
      expect(policy).toContain("object-src 'none'");
      expect(policy).not.toContain("unsafe-eval");
      expect(policy).not.toContain("rpc.walletconnect");
      expect(headers.get("x-frame-options"), path).toBe("DENY");
      expect(headers.get("x-content-type-options"), path).toBe("nosniff");
    }
  });

  it("no policy on /* (it would reach the runner too)", () => {
    const all = rules.find((r) => r.pattern === "/*");
    expect(all?.headers.map(([name]) => name).sort()).toEqual(["referrer-policy", "x-content-type-options"]);
  });

  it("runner: one policy, sandbox allow-scripts without allow-same-origin, framed only by the app", () => {
    for (const path of RUNNER_REQUESTS) {
      const { headers, conflicts } = headersFor(path);
      expect(conflicts, path).toEqual([]);
      const policy = headers.get("content-security-policy") ?? "";
      const directives = policy.split(";").map((d) => d.trim());
      expect(directives).toContain("sandbox allow-scripts");
      expect(directives).toContain("frame-ancestors 'self'");
      expect(policy).not.toContain("allow-same-origin");
      expect(headers.get("x-frame-options"), path).toBe("SAMEORIGIN");
    }
  });

  it("no header name is set twice in one rule", () => {
    for (const rule of rules) {
      const names = rule.headers.map(([name]) => name);
      expect(new Set(names).size, rule.pattern).toBe(names.length);
    }
  });
});

describe("index.html", () => {
  const html = renderIndexHtml(readFileSync(new URL("../index.html", import.meta.url), "utf8"), env);
  const head = /<head>([\s\S]*?)<\/head>/.exec(html)?.[1] ?? "";
  const tags = [...head.matchAll(/<[a-z][^>]*>/g)].map((m) => m[0]);

  it("carries the header policy minus frame-ancestors as a <meta>, first after <meta charset>", () => {
    // Covers the deep paths no _headers rule lists (e.g. /no/such/page), which still get index.html.
    const header = headersFor("/").headers.get("content-security-policy") ?? "";
    const withoutFrameAncestors = header
      .split("; ")
      .filter((d) => !d.startsWith("frame-ancestors "))
      .join("; ");
    expect(withoutFrameAncestors).not.toBe(header);
    expect(tags[0]).toBe('<meta charset="utf-8" />');
    expect(tags[1]).toBe(`<meta http-equiv="Content-Security-Policy" content="${withoutFrameAncestors}" />`);
    expect(tags.filter((t) => t.includes("Content-Security-Policy"))).toHaveLength(1);
  });

  it("the runner page has no policy <meta>: only its own header policy (D-18)", () => {
    const runner = readFileSync(new URL("../public/__runner/index.html", import.meta.url), "utf8");
    expect(runner).not.toContain("Content-Security-Policy");
  });
});

describe(".env.example", () => {
  it("lists exactly the variables the app reads, names only", () => {
    const text = readFileSync(new URL("../../../.env.example", import.meta.url), "utf8");
    const lines = text.split("\n").filter((l) => l.trim() !== "" && !l.startsWith("#"));
    for (const line of lines) expect(line, "no values in .env.example").toMatch(/^[A-Z0-9_]+=$/);
    expect(lines.map((l) => l.slice(0, -1)).sort()).toEqual([...ENV_KEYS].sort());
  });
});
