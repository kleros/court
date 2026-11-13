import { describe, expect, it } from "vitest";
import { CID, GATEWAY, hostileCorpus, whitespaceCorpus } from "./fixtures/corpus.ts";
import * as today from "./fixtures/legacyIpfs.ts";
import { REAL_URI_VALUES } from "./fixtures/realUriValues.ts";
import { isContentAddressed, toHttpUrl } from "./ipfs.ts";

/**
 * Today's toHttpUrl against the new one (spec 02.2): a value the new code accepts must request exactly today's URL,
 * and a value it refuses must have one of these reasons. The reasons are worked out from the value as today's code
 * reads it, never from the new code, so a refusal nobody explained fails the test.
 */
type Reason =
  | "blank"
  | "not content-addressed today either"
  | "tab, LF, CR, backslash or another control character in the path"
  | "percent-encoded dot, slash or backslash in the path"
  | "dot segment in the path"
  | "empty segment inside the path, or more than one trailing slash";

/** The path as today's code puts it in the URL: after the prefix strip, before the first `?` or `#`. */
function todaysPath(uri: string): string {
  const path = today.toIpfsPath(uri);
  const end = path.search(/[?#]/);
  return end === -1 ? path : path.slice(0, end);
}

function refusalReason(uri: string): Reason | undefined {
  if (uri.trim() === "") return "blank";
  if (!today.isContentAddressed(uri)) return "not content-addressed today either";
  const path = todaysPath(uri);
  // eslint-disable-next-line no-control-regex -- matching control characters is the point
  if (/[\u0000-\u001f\u007f\\]/.test(path)) return "tab, LF, CR, backslash or another control character in the path";
  if (/%(?:2e|2f|5c)/i.test(path)) return "percent-encoded dot, slash or backslash in the path";
  const segments = path.split("/");
  if (segments.some((segment) => segment === "." || segment === "..")) return "dot segment in the path";
  if (segments.slice(1, -1).includes("")) return "empty segment inside the path, or more than one trailing slash";
  return undefined;
}

/** Runs every value through both; returns the values the new code accepted and the ones it refused, with the reason. */
function compare(uris: readonly string[]) {
  const accepted: string[] = [];
  const refused: [string, Reason | undefined][] = [];
  for (const uri of uris) {
    const label = JSON.stringify(uri);
    // Never wider than today: what the new code calls content-addressed, today's code does too.
    if (isContentAddressed(uri)) expect(today.isContentAddressed(uri), label).toBe(true);
    const url = toHttpUrl(uri, GATEWAY);
    if (url === null) {
      refused.push([uri, refusalReason(uri)]);
    } else {
      accepted.push(uri);
      expect(new URL(url).href, label).toBe(new URL(today.toHttpUrl(uri) ?? "").href);
    }
  }
  return { accepted, refused };
}

function countByReason(refused: [string, Reason | undefined][]) {
  const counts: Partial<Record<Reason | "no reason", number>> = {};
  for (const [, reason] of refused) counts[reason ?? "no reason"] = (counts[reason ?? "no reason"] ?? 0) + 1;
  return counts;
}

/** Whitespace right before the first `?` or `#`: spec 02.2 requests it as part of the file name. */
function whitespaceBeforeCut(uri: string): boolean {
  const trimmed = uri.trim();
  const end = trimmed.search(/[?#]/);
  return end !== -1 && /\s$/.test(trimmed.slice(0, end));
}

describe("toHttpUrl against today's", () => {
  it("compares on today's gateway", () => {
    expect(today.IPFS_GATEWAY).toBe(GATEWAY);
  });

  it("requests today's URL for every hostile corpus value it accepts; each refusal has a listed reason", () => {
    const { accepted, refused } = compare(hostileCorpus());
    expect(accepted).toHaveLength(11750);
    expect(accepted.filter(whitespaceBeforeCut)).toHaveLength(2970);
    expect(countByReason(refused)).toEqual({
      "tab, LF, CR, backslash or another control character in the path": 25200,
      "percent-encoded dot, slash or backslash in the path": 22320,
      "dot segment in the path": 5880,
      "empty segment inside the path, or more than one trailing slash": 1090,
    });
  });

  it("does the same with whitespace before, inside and after ? and #, at the start and at the end", () => {
    const { accepted, refused } = compare(whitespaceCorpus());
    expect(accepted).toHaveLength(12672);
    expect(accepted.filter(whitespaceBeforeCut)).toHaveLength(5760);
    expect(countByReason(refused)).toEqual({
      "not content-addressed today either": 1152,
      "tab, LF, CR, backslash or another control character in the path": 2592,
      "percent-encoded dot, slash or backslash in the path": 1824,
      "dot segment in the path": 2880,
    });
  });

  it("does the same for the spec 02.2 forms and the cases the other uri tests name", () => {
    const requestedAsToday = [
      `ipfs://${CID}`,
      `ipfs:${CID}/a.json`,
      `/ipfs/${CID}/a.json`,
      `ipfs/${CID}/a.json`,
      `fs:/${CID}/a.json`,
      `fs:/ipfs/${CID}/a.json`,
      `ipfs:///ipfs/${CID}/a.json`,
      `${CID}/Agreed Facts.pdf`,
      `${CID}/Court%20Policy.pdf`,
      `${CID}/Moderation%2520Policy.pdf`,
      `${CID}/r\u00e9sum\u00e9.pdf`,
      `/ipfs/${CID}/index.html#/route`,
      `/ipfs/${CID}/a.pdf?filename=a.html#p`,
      `ipfs://${CID}/report ?x`,
      `${CID}/a\u00a0#p`,
      `${CID}/.. ?x`,
      `https://cdn.kleros.link/ipfs/${CID}`,
      `  https://example.org/x?y#z \n`,
    ];
    const refusedWithReason: [string, Reason][] = [
      [`${CID} ?x`, "not content-addressed today either"],
      [`/ipns/${CID}`, "not content-addressed today either"],
      ["HTTPS://example.org", "not content-addressed today either"],
      ["javascript:alert(1)", "not content-addressed today either"],
      [`${CID}/a\t?x`, "tab, LF, CR, backslash or another control character in the path"],
      [`${CID}/.\t./x`, "tab, LF, CR, backslash or another control character in the path"],
      [`${CID}/..\\x`, "tab, LF, CR, backslash or another control character in the path"],
      [`${CID}/%2e%2e/x`, "percent-encoded dot, slash or backslash in the path"],
      [`${CID}/../../x`, "dot segment in the path"],
      [`${CID}/..?x`, "dot segment in the path"],
      [`${CID}/a//b`, "empty segment inside the path, or more than one trailing slash"],
      ["", "blank"],
      ["   ", "blank"],
    ];
    const { accepted, refused } = compare([...requestedAsToday, ...refusedWithReason.map(([uri]) => uri)]);
    expect(accepted).toEqual(requestedAsToday);
    expect(refused).toEqual(refusedWithReason);
  });

  it("requests today's URL for every one of the real values", () => {
    const { accepted, refused } = compare(REAL_URI_VALUES);
    expect(accepted).toHaveLength(REAL_URI_VALUES.length);
    expect(refused).toEqual([]);
  });
});
