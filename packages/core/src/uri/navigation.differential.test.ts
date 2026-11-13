import { describe, expect, it } from "vitest";
import { GATEWAY, hostileCorpus, whitespaceCorpus } from "./fixtures/corpus.ts";
import * as today from "./fixtures/legacyUrlValidation.ts";
import { REAL_URI_VALUES } from "./fixtures/realUriValues.ts";
import { toHttpUrl } from "./ipfs.ts";
import { isSafeNavigationUrl, URL_PARSE_BOUND } from "./navigation.ts";

/**
 * Today's isSafeNavigationUrl against the new one (spec 02.2, P73): the same answer for every value of at most
 * URL_PARSE_BOUND characters after trimming; above it the new one refuses.
 */

/** Host labels that are not plain ASCII: scripts, joiners, combining marks, mixed direction, odd separators. */
const HOST_UNITS = [
  "é.",
  "一二三四五六七八.",
  "가나다.",
  "𠀀𠀁.",
  "α.",
  "a\u200db.",
  `a${"\u0301".repeat(30)}.`,
  "\u05d0\u05d11.",
  "a\uff0e",
  "ß.",
  "ﬃ.",
  "İ.",
  "\u00ad.",
  "xn--fiq228c.",
  "xn--a.",
  "-a.",
  "%E4%B8%80.",
  "1.",
];

/** `value` with a path of `a` appended so it is exactly `length` units long (unchanged if it already is). */
function fill(value: string, length: number): string {
  return value.length < length ? `${value}/${"a".repeat(length - value.length - 1)}` : value;
}

/** Each host shape a few labels long, as long as fits, and filled to exactly the bound; in the host and in userinfo. */
function hostValues(): string[] {
  const values: string[] = [];
  for (const unit of HOST_UNITS) {
    const most = Math.floor((URL_PARSE_BOUND - "https://org".length) / unit.length);
    for (const count of [1, 2, 63, 64, most]) {
      const url = `https://${unit.repeat(count)}org`;
      values.push(url, fill(url, URL_PARSE_BOUND), `https://${unit.repeat(count)}@example.org`);
    }
  }
  values.push(fill(`https://example.org:${"0".repeat(URL_PARSE_BOUND - 30)}443`, URL_PARSE_BOUND));
  return values;
}

/** Characters JavaScript's trim() removes (and none). */
const SPACES = ["", " ", "\t", "\n", "\r", "\f", "\v", "\u00a0", "\u1680", "\u2028", "\u3000", "\ufeff"];
/** Characters trim() keeps: C0 controls (the URL parser drops them at either end), a zero-width space, NEL. */
const KEPT = ["\u0000", "\u001f", "\u200b", "\u0085"];

function whitespaceValues(): string[] {
  const bases = ["https://example.org", "http://example.org", "javascript:alert(1)", fill("https://e.org", 8000)];
  const values: string[] = [];
  for (const base of bases) {
    for (const run of [...SPACES, ...KEPT]) {
      values.push(`${run}${base}`, `${base}${run}`, `${run}${base}${run}`, `https:${run}//example.org`);
      values.push(`https://exa${run}mple.org`, fill(`${run}${base}`, URL_PARSE_BOUND));
    }
    for (const run of SPACES.slice(1)) {
      const padding = run.repeat(URL_PARSE_BOUND);
      values.push(`${padding}${base}${padding}`, `${padding}${fill(base, URL_PARSE_BOUND)}`);
    }
  }
  return values;
}

const PROTOCOLS = [
  "https://example.org",
  "HTTPS://example.org",
  "https:example.org",
  "https:/example.org",
  "https:\\\\example.org",
  "httpsx://example.org",
  "https-x://example.org",
  "http://example.org",
  "javascript:alert(1)",
  "JavaScript:alert(1)",
  "java\tscript:alert(1)",
  "data:text/html,<script>alert(1)</script>",
  "vbscript:msgbox(1)",
  "file:///etc/passwd",
  "ftp://example.org",
  "blob:https://example.org/uuid",
  "ws://example.org",
  "wss://example.org",
  "mailto:a@example.org",
  "about:blank",
  "view-source:https://example.org",
];

const UNPARSABLE = [
  "",
  "   ",
  "example.org",
  "/ipfs/x",
  "//example.org",
  "https://",
  "https://exa mple.org",
  "https://[::1",
  "https://a:b:c",
  "https://%",
  "https://exa%00mple.org",
  "https://ex<ample.org",
  "https://example.org:99999",
  "https://1.2.3.4.5",
  "https://0x100000000",
  "https://xn--",
  `https://${"a".repeat(64)}.org`,
];

const NON_STRINGS: unknown[] = [
  null,
  undefined,
  0,
  1,
  Number.NaN,
  true,
  false,
  1n,
  {},
  [],
  ["https://example.org"],
  new String("https://example.org"),
  new URL("https://example.org"),
  { trim: () => "https://example.org" },
];

/** Every value: real case-file and evidence URIs, the shared IPFS corpora, the generated ones; raw and via toHttpUrl. */
function allValues(): unknown[] {
  const strings = [
    ...REAL_URI_VALUES,
    ...hostileCorpus(),
    ...whitespaceCorpus(),
    ...hostValues(),
    ...whitespaceValues(),
    ...PROTOCOLS,
    ...UNPARSABLE,
  ];
  const viaGateway = strings.map((uri) => toHttpUrl(uri, GATEWAY)).filter((url) => url !== null);
  return [...strings, ...viaGateway, ...NON_STRINGS];
}

const withinBound = (value: unknown) => typeof value !== "string" || value.trim().length <= URL_PARSE_BOUND;
const label = (value: unknown) => (typeof value === "string" ? JSON.stringify(value.slice(0, 120)) : String(value));

describe("isSafeNavigationUrl against today's", () => {
  const values = allValues();

  it("answers as today for every value within the bound after trimming", () => {
    const within = values.filter(withinBound);
    const mismatches = within.filter((value) => isSafeNavigationUrl(value) !== today.isSafeNavigationUrl(value));
    expect(mismatches.map(label)).toEqual([]);

    const accepted = within.filter((value) => isSafeNavigationUrl(value));
    expect(accepted.length).toBeGreaterThan(0);
    expect(within.length - accepted.length).toBeGreaterThan(0);
    const strings = accepted.filter((value) => typeof value === "string");
    expect(strings.some((url) => url.trim().length === URL_PARSE_BOUND)).toBe(true);
    expect(strings.some((url) => url.length > URL_PARSE_BOUND)).toBe(true);
  });

  it("refuses every value over the bound after trimming, including ones today accepts", () => {
    const atBound = values.filter(
      (value): value is string => typeof value === "string" && value.trim().length === URL_PARSE_BOUND,
    );
    const over = [...values.filter((value) => !withinBound(value)), ...atBound.map((url) => `${url.trim()}a`)];
    expect(over.filter((value) => isSafeNavigationUrl(value)).map(label)).toEqual([]);
    expect(over.some((value) => today.isSafeNavigationUrl(value))).toBe(true);
  });
});
