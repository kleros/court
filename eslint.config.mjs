import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import security from "eslint-plugin-security";
import noUnsanitized from "eslint-plugin-no-unsanitized";
import globals from "globals";
import { builtinModules } from "node:module";

const WAGMI_READS =
  "Chain reads go through the app's own viem clients (src/wallet/readClients.ts), never wagmi's config.";

// Core runs unbuilt under Node's type stripping (lab proofs and operator scripts load its .ts files directly), so it
// may use only TypeScript that Node can strip.
const NODE_STRIPPABLE = [
  {
    selector: "TSEnumDeclaration",
    message: "No enums in core: Node's type stripping cannot run them. Use a union of string literals.",
  },
  {
    selector: "TSParameterProperty",
    message: "No parameter properties in core: Node's type stripping cannot run them. Assign fields in the body.",
  },
];

// Import rules for every core file, src and operator scripts.
const CORE_IMPORT_PATTERNS = [
  {
    group: ["react", "react-*", "react/*", "wagmi", "wagmi/*", "@wagmi/*", "@reown/*", "@court/web"],
    message: "core is framework-free: no React, no wallet libraries, no app code.",
  },
  {
    // A relative specifier without ".ts" ("./x", "../kernel", "."): Node does not add extensions.
    regex: String.raw`^\.\.?(?:/(?!.*\.ts$).*)?$`,
    message: "Import core files with an explicit .ts specifier (../kernel/index.ts): Node loads them as named.",
  },
];

// no-restricted-imports checks static specifiers only; an import() would pass it with any specifier.
const STATIC_IMPORTS_ONLY = {
  selector: "ImportExpression",
  message: "core imports statically, so the import rules can check every specifier: no import().",
};

// Core is the same code in the browser and in Node: storage, fetch and environment values come in as arguments.
const CORE_INJECTED = "core has no DOM and reads no environment: take it as an argument from the caller.";
const CORE_GLOBALS = [
  "window",
  "self",
  "globalThis",
  "document",
  "location",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "fetch",
  "process",
];

// A Node module reads the environment without the global (import { env } from "node:process"), and none exists
// in the browser.
const NODE_BUILTINS = "core runs in the browser too: no Node built-in modules in src (operator scripts may use them).";

export default tseslint.config(
  {
    ignores: [
      "legacy/**",
      "scripts/verify-snapshot-roots.js",
      "**/dist/**",
      "**/node_modules/**",
      ".yarn/**",
      "coverage/**",
      "**/public/snapshots.json",
      // Playwright's output (gitignored): the fetch-cache test keeps browser profiles there, with their own scripts.
      "packages/*/test-results/**",
    ],
  },
  js.configs.recommended,
  security.configs.recommended,
  noUnsanitized.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: { globals: globals.node },
  },
  {
    // Core's operator scripts are TypeScript too; their project is packages/core/scripts/tsconfig.json (Node types).
    files: ["packages/*/src/**/*.{ts,tsx}", "packages/core/scripts/**/*.ts"],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      // Flags every typed index access (obj[key]); TypeScript key types + noUncheckedIndexedAccess cover it here.
      "security/detect-object-injection": "off",
    },
  },
  {
    // Build tooling and tests read and write files at paths they compute themselves; not user input.
    files: [
      "packages/*/scripts/**",
      "packages/*/*.config.ts",
      "packages/*/src/**/*.test.{ts,tsx}",
      "packages/web/e2e/**",
    ],
    rules: {
      "security/detect-non-literal-fs-filename": "off",
      "security/detect-object-injection": "off",
    },
  },
  {
    files: ["packages/*/*.config.ts", "packages/web/vite-plugins/**/*.ts", "packages/web/e2e/**/*.ts"],
    extends: [tseslint.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    // Evaluating text as code happens in one function, inside the script runner's opaque-origin page (D-18); nowhere
    // else in either package, in any form (direct or indirect eval, the Function constructor).
    files: ["packages/**/*.{js,mjs,cjs,ts,tsx}"],
    ignores: ["packages/web/src/runner/page/evaluate.ts"],
    rules: {
      "no-eval": ["error", { allowIndirect: false }],
      "no-new-func": "error",
    },
  },
  {
    // End-to-end specs and lab helpers: page.evaluate / addInitScript callbacks run in the browser.
    files: ["packages/web/e2e/**/*.spec.ts"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["packages/core/src/**/*.ts", "packages/core/scripts/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: CORE_IMPORT_PATTERNS }],
      "no-restricted-syntax": ["error", ...NODE_STRIPPABLE, STATIC_IMPORTS_ONLY],
    },
  },
  {
    // Operator scripts may read process.env, fetch and Node's modules; core's own code may not.
    files: ["packages/core/src/**/*.ts"],
    rules: {
      "no-restricted-globals": ["error", ...CORE_GLOBALS.map((name) => ({ name, message: CORE_INJECTED }))],
      // Rule options do not merge across blocks: these repeat the core patterns above and add Node's modules.
      "no-restricted-imports": [
        "error",
        {
          paths: builtinModules.map((name) => ({ name, message: NODE_BUILTINS })),
          patterns: [...CORE_IMPORT_PATTERNS, { regex: "^node:", message: NODE_BUILTINS }],
        },
      ],
      "no-restricted-syntax": [
        "error",
        ...NODE_STRIPPABLE,
        STATIC_IMPORTS_ONLY,
        { selector: "MemberExpression[object.type='MetaProperty'][property.name='env']", message: CORE_INJECTED },
      ],
    },
  },
  {
    files: ["packages/web/src/**/*.{ts,tsx}"],
    plugins: { react, "react-hooks": reactHooks },
    settings: { react: { version: "18.3" } },
    languageOptions: { globals: globals.browser },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      ...reactHooks.configs["recommended-latest"].rules,
      "react/no-danger": "error",
      "react/jsx-no-target-blank": ["error", { allowReferrer: false }],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "wagmi",
              importNames: [
                "useReadContract",
                "useReadContracts",
                "useBalance",
                "useBlockNumber",
                "useBlock",
                "usePublicClient",
                "useClient",
                "useSimulateContract",
                "useEstimateGas",
                "useWatchContractEvent",
                "useTransaction",
                "useTransactionReceipt",
                "useWaitForTransactionReceipt",
              ],
              message: WAGMI_READS,
            },
            { name: "@wagmi/core", message: WAGMI_READS },
            { name: "wagmi/actions", message: WAGMI_READS },
          ],
        },
      ],
    },
  },
);
