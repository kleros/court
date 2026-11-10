// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ENV_KEYS, readEnv, renderHeaders } from "@court/core";

const template = readFileSync(new URL("../public/_headers", import.meta.url), "utf8");
const rendered = renderHeaders(template, readEnv({ REACT_APP_WALLETCONNECT_PROJECT_ID: "id" }));

interface Rule {
  readonly pattern: string;
  readonly headers: readonly (readonly [string, string])[];
}

/**
 * Netlify path matching as the court lab reads it (court-lab lib/build/netlify-headers.mjs): "*" = any rest of the
 * path (also nothing), ":name" = one non-empty segment, everything else literal.
 */
function matches(pattern: string, path: string): boolean {
  if (pattern === "") return path === "";
  if (pattern.startsWith("*")) {
    for (let i = 0; i <= path.length; i++) if (matches(pattern.slice(1), path.slice(i))) return true;
    return false;
  }
  const param = /^:[A-Za-z_][A-Za-z0-9_]*/.exec(pattern)?.[0];
  if (param !== undefined) {
    const segment = /^[^/]+/.exec(path)?.[0] ?? "";
    for (let n = 1; n <= segment.length; n++) if (matches(pattern.slice(param.length), path.slice(n))) return true;
    return false;
  }
  return path.startsWith(pattern.charAt(0)) && matches(pattern.slice(1), path.slice(1));
}

/** `_headers` text -> rules in file order; a rule applies to every request path its pattern matches. */
function parse(text: string): Rule[] {
  const rules: { pattern: string; headers: [string, string][] }[] = [];
  for (const line of text.split("\n")) {
    if (line.trim() === "" || line.trimStart().startsWith("#")) continue;
    if (!line.startsWith(" ")) {
      rules.push({ pattern: line.trim(), headers: [] });
      continue;
    }
    const rule = rules.at(-1);
    if (rule === undefined) throw new Error(`header line before any path: ${line}`);
    const colon = line.indexOf(":");
    rule.headers.push([line.slice(0, colon).trim().toLowerCase(), line.slice(colon + 1).trim()]);
  }
  return rules;
}

const rules = parse(rendered);

/** The headers a request path gets, and every name two matching rules both set (how Netlify combines them is UNVERIFIED). */
function headersFor(path: string) {
  const headers = new Map<string, string>();
  const conflicts: string[] = [];
  const matched: string[] = [];
  for (const rule of rules) {
    if (!matches(rule.pattern, path)) continue;
    matched.push(rule.pattern);
    for (const [name, value] of rule.headers) {
      if (headers.has(name)) conflicts.push(name);
      else headers.set(name, value);
    }
  }
  return { headers, conflicts, matched };
}

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

describe(".env.example", () => {
  it("lists exactly the variables the app reads, names only", () => {
    const text = readFileSync(new URL("../../../.env.example", import.meta.url), "utf8");
    const lines = text.split("\n").filter((l) => l.trim() !== "" && !l.startsWith("#"));
    for (const line of lines) expect(line, "no values in .env.example").toMatch(/^[A-Z0-9_]+=$/);
    expect(lines.map((l) => l.slice(0, -1)).sort()).toEqual([...ENV_KEYS].sort());
  });
});
