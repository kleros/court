#!/usr/bin/env node
/**
 * Checks a finished build: only the app's public variables (ENV_KEYS, packages/core/src/env.ts) may reach the bundle
 * (vite.config.ts picks them, design D14). Lists every REACT_APP_ name found in the build's files, source maps included,
 * and fails when one is not in ENV_KEYS, or when the value of a REACT_APP_ variable of this process's environment that
 * is not in ENV_KEYS is found (CI runs the build and this check with one such variable planted). Prints names only,
 * never a value.
 *
 * usage: node packages/web/scripts/check-bundle-env.mjs <build dir>
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ENV_KEYS } from "@court/core";

const dir = process.argv[2];
if (dir === undefined) {
  console.error("usage: node packages/web/scripts/check-bundle-env.mjs <build dir>");
  process.exit(2);
}

const PUBLIC = new Set(ENV_KEYS);
const notPublic = Object.entries(process.env).filter(
  ([name, value]) => name.startsWith("REACT_APP_") && !PUBLIC.has(name) && value,
);

/** The order `sort()` gives with no compare function (UTF-16 code units), whatever the locale. */
function byCodeUnit(a, b) {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

const names = new Set();
const valuesFound = new Set();
for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const text = readFileSync(join(entry.parentPath, entry.name), "latin1");
  for (const name of text.match(/REACT_APP_[A-Z0-9_]+/g) ?? []) names.add(name);
  for (const [name, value] of notPublic) if (text.includes(value)) valuesFound.add(name);
}

const extraNames = [...names].filter((name) => !PUBLIC.has(name)).sort(byCodeUnit);
console.log(`REACT_APP_ names in ${dir}: ${[...names].sort(byCodeUnit).join(", ") || "none"}`);
console.log(`not-public REACT_APP_ variables in this environment: ${notPublic.length}`);
if (extraNames.length > 0) console.error(`names not in ENV_KEYS: ${extraNames.join(", ")}`);
if (valuesFound.size > 0)
  console.error(`values of not-public variables found: ${[...valuesFound].sort(byCodeUnit).join(", ")}`);
process.exit(extraNames.length > 0 || valuesFound.size > 0 ? 1 : 0);
