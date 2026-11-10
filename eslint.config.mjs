import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import security from "eslint-plugin-security";
import noUnsanitized from "eslint-plugin-no-unsanitized";
import globals from "globals";

const WAGMI_READS =
  "Chain reads go through the app's own viem clients (src/wallet/readClients.ts), never wagmi's config (03 DEC-REOWN).";

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
    files: ["packages/*/src/**/*.{ts,tsx}"],
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
    files: ["packages/*/*.config.ts", "packages/web/e2e/**/*.ts"],
    extends: [tseslint.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    // End-to-end specs and lab helpers: page.evaluate / addInitScript callbacks run in the browser.
    files: ["packages/web/e2e/**/*.spec.ts"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["packages/core/src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-*", "react/*", "wagmi", "wagmi/*", "@wagmi/*", "@reown/*", "@court/web"],
              message: "core is framework-free: no React, no wallet libraries, no app code.",
            },
          ],
        },
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
