import { afterEach, describe, expect, it, vi } from "vitest";
import { isSafeNavigationUrl, URL_PARSE_BOUND } from "./navigation.ts";

/** A valid https URL: an ASCII host, then a path of `fill` and, if given, `last`, `length` UTF-16 units long in all. */
function httpsUrl(length: number, fill: string, last = ""): string {
  const head = "https://example.org/";
  const url = head + fill.repeat((length - head.length - last.length) / fill.length) + last;
  expect(url.length).toBe(length);
  return url;
}

describe("isSafeNavigationUrl", () => {
  it("accepts a URL that parses with protocol https:, after trimming (spec 02.2)", () => {
    for (const url of [
      "https://example.org",
      "https://cdn.kleros.link/ipfs/QmRnwMuc7kGipQkjzPY9jhcttRhebPRYwEvBVGTjmkMwe9/index.html?x=1#y",
      "  https://example.org/a \n",
      " https://example.org ", // trim() also drops what the URL parser keeps: no-break space, line separator
      "HTTPS://EXAMPLE.ORG", // the URL parser lowercases the scheme
    ]) {
      expect(isSafeNavigationUrl(url), url).toBe(true);
    }
  });

  it("refuses every other protocol, including scripts and inline documents", () => {
    for (const url of [
      "http://example.org",
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      " javascript:alert(1)",
      "java\tscript:alert(1)", // the parser drops the tab: still javascript:
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
      "ftp://example.org",
      "blob:https://example.org/uuid",
      "wss://example.org",
    ]) {
      expect(isSafeNavigationUrl(url), url).toBe(false);
    }
  });

  it("refuses what does not parse as an absolute URL, and non-strings", () => {
    for (const url of ["", "   ", "example.org", "/ipfs/x", "//example.org", "https://", "https://exa mple.org"]) {
      expect(isSafeNavigationUrl(url), url).toBe(false);
    }
    for (const value of [
      null,
      undefined,
      1,
      {},
      ["https://example.org"],
      new URL("https://example.org"),
      new String("https://example.org"), // a String object is not a string
      { trim: () => "https://example.org" },
    ]) {
      expect(isSafeNavigationUrl(value), typeof value).toBe(false);
    }
  });

  it("narrows the value to a string for the caller", () => {
    const value: unknown = "https://example.org";
    if (isSafeNavigationUrl(value)) expect(value.length).toBe(19);
    else expect.unreachable();
  });
});

describe("isSafeNavigationUrl length bound (P73)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is 8,192 characters", () => {
    expect(URL_PARSE_BOUND).toBe(8192);
  });

  it("accepts a valid https URL of exactly the bound, counted in UTF-16 units after trimming", () => {
    for (const url of [
      httpsUrl(URL_PARSE_BOUND, "a"),
      httpsUrl(URL_PARSE_BOUND, "é"), // 8,192 units, more UTF-8 bytes
      ` \n${httpsUrl(URL_PARSE_BOUND, "a")}\u00a0 `,
    ]) {
      expect(isSafeNavigationUrl(url)).toBe(true);
    }
  });

  it("accepts a short URL padded with whitespace past the bound, as today", () => {
    const padding = " ".repeat(URL_PARSE_BOUND);
    expect(isSafeNavigationUrl(`${padding}https://example.org${padding}`)).toBe(true);
  });

  it("refuses a valid https URL one unit over the bound", () => {
    for (const url of [
      httpsUrl(URL_PARSE_BOUND + 1, "a"),
      httpsUrl(URL_PARSE_BOUND + 1, "😀", "a"), // 8,193 units, fewer code points
      ` ${httpsUrl(URL_PARSE_BOUND + 1, "a")} `,
    ]) {
      expect(isSafeNavigationUrl(url)).toBe(false);
    }
  });

  it("refuses an over-bound value without handing it to the URL parser", () => {
    const atBound = httpsUrl(URL_PARSE_BOUND, "a");
    const overBound = httpsUrl(URL_PARSE_BOUND + 1, "a");
    const longHost = `https://${"é.".repeat(URL_PARSE_BOUND)}org`;
    const parser = vi.fn(URL);
    vi.stubGlobal("URL", parser);

    expect(isSafeNavigationUrl(atBound)).toBe(true);
    expect(parser).toHaveBeenCalledTimes(1); // the spy sees the parse at the bound
    parser.mockClear();
    expect(isSafeNavigationUrl(overBound)).toBe(false);
    expect(isSafeNavigationUrl(longHost)).toBe(false);
    expect(parser).not.toHaveBeenCalled();
  });
});
