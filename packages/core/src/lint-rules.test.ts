import { ESLint } from "eslint";
import tseslint from "typescript-eslint";
import { describe, expect, it } from "vitest";

// The repo's own eslint.config.mjs, found from the working directory (vitest runs in packages/core), so probe paths
// are relative to packages/core. Every rule checked here reads syntax only, so type information is switched off and
// the probe files need not exist.
const eslint = new ESLint({ overrideConfig: tseslint.configs.disableTypeChecked });

/** Lints `code` as if it were the file `path` and returns every problem, parser errors included. */
async function problems(path: string, code: string) {
  const results = await eslint.lintText(code, { filePath: path });
  return results.flatMap((result) => result.messages.map(({ ruleId, message }) => ({ ruleId, message })));
}

function refusedBy(ruleId: string, message: string) {
  return [{ ruleId, message: expect.stringContaining(message) as unknown }];
}

const SRC = "src/probe.ts";
const SCRIPT = "scripts/probe.ts";

const DYNAMIC = "core imports statically";
const NODE = "core runs in the browser too";
const TS_SPECIFIER = "Import core files with an explicit .ts specifier";
const FRAMEWORK = "core is framework-free";
const INJECTED = "core has no DOM and reads no environment";

describe("core lint rules", { timeout: 30_000 }, () => {
  it("refuse import() in core code: the specifier checks see static imports only", async () => {
    for (const code of [
      'export const load = (): Promise<unknown> => import("./kernel/address");',
      'export const load = (): Promise<unknown> => import("./kernel/address.ts");',
      "export const load = (): Promise<unknown> => import(`./kernel/address.ts`);",
      'export const load = (): Promise<unknown> => import("react");',
      'export const load = (): Promise<unknown> => import("node:process");',
    ]) {
      expect(await problems(SRC, code), code).toEqual(refusedBy("no-restricted-syntax", DYNAMIC));
      expect(await problems(SCRIPT, code), code).toEqual(refusedBy("no-restricted-syntax", DYNAMIC));
    }
  });

  it("refuse Node built-in modules in core src, by node: name, bare name, re-export or type import", async () => {
    for (const code of [
      'import { env } from "node:process";\nexport const mode = env.NODE_ENV;',
      'import process from "node:process";\nexport const mode = process.env.NODE_ENV;',
      'import { env } from "process";\nexport const mode = env.NODE_ENV;',
      'import { readFile } from "node:fs/promises";\nexport const read = readFile;',
      'import { join } from "path";\nexport const joinPath = join;',
      'export { env } from "node:process";',
      'import type { Stats } from "node:fs";\nexport type FileStats = Stats;',
    ]) {
      expect(await problems(SRC, code), code).toEqual(refusedBy("no-restricted-imports", NODE));
    }
  });

  it("let operator scripts use Node built-ins and the environment", async () => {
    for (const code of [
      'import { env } from "node:process";\nexport const mode = env.NODE_ENV;',
      "export const mode = process.env.NODE_ENV;",
    ]) {
      expect(await problems(SCRIPT, code), code).toEqual([]);
    }
  });

  it("still refuse a specifier without .ts, a framework import, an enum, the global process, import.meta.env", async () => {
    const cases: [path: string, code: string, ruleId: string, message: string][] = [
      [
        SRC,
        'import { toAddress } from "./kernel/address";\nexport const a = toAddress;',
        "no-restricted-imports",
        TS_SPECIFIER,
      ],
      [
        SCRIPT,
        'import { readEnv } from "../src/env";\nexport const r = readEnv;',
        "no-restricted-imports",
        TS_SPECIFIER,
      ],
      [SRC, 'import { useState } from "react";\nexport const s = useState;', "no-restricted-imports", FRAMEWORK],
      [SCRIPT, 'import { useState } from "react";\nexport const s = useState;', "no-restricted-imports", FRAMEWORK],
      [SRC, "export enum Mode {\n  Live,\n}", "no-restricted-syntax", "No enums in core"],
      [SCRIPT, "export enum Mode {\n  Live,\n}", "no-restricted-syntax", "No enums in core"],
      [SRC, "export const mode = process.env.NODE_ENV;", "no-restricted-globals", INJECTED],
      [SRC, "export const mode: unknown = import.meta.env;", "no-restricted-syntax", INJECTED],
    ];
    for (const [path, code, ruleId, message] of cases) {
      expect(await problems(path, code), `${path}: ${code}`).toEqual(refusedBy(ruleId, message));
    }
  });

  it("accept static .ts and package imports in core src", async () => {
    for (const code of [
      'import { toAddress } from "./kernel/address.ts";\nexport const a = toAddress;',
      'import { keccak256 } from "viem";\nexport const hash = keccak256;',
    ]) {
      expect(await problems(SRC, code), code).toEqual([]);
    }
  });
});
