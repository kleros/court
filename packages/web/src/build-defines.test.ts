// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("values vite.config.ts sets at build", () => {
  it("the release version is the root package.json's, so Sentry reports court@<that version>", () => {
    const root = JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8")) as {
      version: string;
    };
    expect(__COURT_VERSION__).toBe(root.version);
  });
});
