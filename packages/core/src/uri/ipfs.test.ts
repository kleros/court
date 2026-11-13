import { describe, expect, it } from "vitest";
import { CID, CIDV1, GATEWAY, hostileCorpus, whitespaceCorpus } from "./fixtures/corpus.ts";
import * as today from "./fixtures/legacyIpfs.ts";
import { canonicalContentPath, gatewayUrl, isContentAddressed, toHttpUrl, toIpfsPath } from "./ipfs.ts";

describe("toIpfsPath", () => {
  it("strips today's prefixes and surrounding whitespace, nothing else (spec 02.2)", () => {
    for (const uri of [
      `ipfs://${CID}/a.json`,
      `ipfs:${CID}/a.json`,
      `ipfs://ipfs/${CID}/a.json`,
      `ipfs:///ipfs/${CID}/a.json`,
      `/ipfs/${CID}/a.json`,
      `ipfs/${CID}/a.json`,
      `fs:/${CID}/a.json`,
      `fs:/ipfs/${CID}/a.json`,
      `/${CID}/a.json`,
      `${CID}/a.json`,
      `  /ipfs/${CID}/a.json \n`,
    ]) {
      expect(toIpfsPath(uri), uri).toBe(`${CID}/a.json`);
    }
  });

  it("leaves other forms as they are, so they fail the content check", () => {
    expect(toIpfsPath(`https://cdn.kleros.link/ipfs/${CID}`)).toBe(`https://cdn.kleros.link/ipfs/${CID}`);
    expect(toIpfsPath(`/ipns/${CID}`)).toBe(`ipns/${CID}`);
    expect(toIpfsPath(`IPFS://${CID}`)).toBe(`IPFS://${CID}`);
  });
});

describe("canonicalContentPath", () => {
  it("accepts every IPFS form of spec 02.2 and returns CID[/segments] as written", () => {
    for (const uri of [`ipfs://${CID}`, `/ipfs/${CID}`, `ipfs/${CID}`, `fs:/${CID}`, CID, ` ${CID} `]) {
      expect(canonicalContentPath(uri), uri).toBe(CID);
    }
    expect(canonicalContentPath(`/ipfs/${CID}/dir/file.js`)).toBe(`${CID}/dir/file.js`);
    expect(canonicalContentPath(`ipfs://${CIDV1}/evidence.json`)).toBe(`${CIDV1}/evidence.json`);
    expect(canonicalContentPath(CIDV1)).toBe(CIDV1);
  });

  it("keeps ONE trailing slash, so a directory entry and the bare CID stay two different paths", () => {
    expect(canonicalContentPath(`${CID}/`)).toBe(`${CID}/`);
    expect(canonicalContentPath(`/ipfs/${CID}/`)).toBe(`${CID}/`);
    expect(canonicalContentPath(CID)).toBe(CID);
    expect(canonicalContentPath(`${CID}/dir/`)).toBe(`${CID}/dir/`);
  });

  it("keeps the file names real case files and evidence use: spaces, %20, a double-encoded %2520, unicode", () => {
    for (const path of [
      `${CID}/Agreed Facts.pdf`,
      `${CID}/Untitled document (1).pdf`,
      `${CID}/Court%20Policy.pdf`,
      `${CID}/Moderation%2520Policy.pdf`,
      `${CID}/2020-07-16 20.21.55.jpg`,
      `${CID}/résumé.pdf`,
      `${CID}/...`,
      `${CID}/.hidden`,
      `${CID}/a..b`,
    ]) {
      expect(canonicalContentPath(`/ipfs/${path}`), path).toBe(path);
    }
  });

  it("leaves a query or fragment out: the content address is the path alone", () => {
    expect(canonicalContentPath(`/ipfs/${CID}/a.pdf?filename=a.html`)).toBe(`${CID}/a.pdf`);
    expect(canonicalContentPath(`/ipfs/${CID}/a.pdf#page=2`)).toBe(`${CID}/a.pdf`);
    expect(canonicalContentPath(`ipfs://${CID}?x`)).toBe(CID);
    expect(canonicalContentPath(`${CID}#x`)).toBe(CID);
    expect(canonicalContentPath(`${CID}/?x`)).toBe(`${CID}/`);
    // Dot segments after the cut belong to the query or fragment, which the URL parser never resolves as a path.
    expect(canonicalContentPath(`${CID}?/../../x`)).toBe(CID);
    expect(canonicalContentPath(`${CID}/a#/../../x`)).toBe(`${CID}/a`);
  });

  it("refuses dot segments anywhere after the CID", () => {
    for (const path of [
      `${CID}/../../x`,
      `${CID}/../../ipns/example.invalid`,
      `${CID}/..`,
      `${CID}/../`,
      `${CID}/.`,
      `${CID}/./x`,
      `${CID}/a/../b`,
      `${CID}/a/./b`,
    ]) {
      expect(canonicalContentPath(`/ipfs/${path}`), path).toBeNull();
    }
  });

  it("refuses a dot segment written just before a query or fragment (the parser resolves it before the ?)", () => {
    expect(canonicalContentPath(`${CID}/..?x`)).toBeNull();
    expect(canonicalContentPath(`${CID}/..#x`)).toBeNull();
    expect(canonicalContentPath(`${CID}/a/.?x`)).toBeNull();
  });

  it("keeps whitespace right before a query or fragment in the path, percent-encoded as the URL parser sends it", () => {
    // Today "ipfs://CID/report ?x" requests the file "report " (.../report%20?x). Written raw, the run would be
    // trimmed by a second check and dropped by the parser at the end of a path-only URL.
    expect(canonicalContentPath(`ipfs://${CID}/report ?x`)).toBe(`${CID}/report%20`);
    expect(canonicalContentPath(`${CID}/a  #x`)).toBe(`${CID}/a%20%20`);
    expect(canonicalContentPath(`${CID}/a\u00a0?x`)).toBe(`${CID}/a%C2%A0`);
    expect(canonicalContentPath(`${CID}/a\u3000 #x`)).toBe(`${CID}/a%E3%80%80%20`);
    expect(canonicalContentPath(`${CID}/a b ?x`)).toBe(`${CID}/a b%20`);
    expect(canonicalContentPath(`${CID}/ ?x`)).toBe(`${CID}/%20`);
    // ".. " is a file name, not a dot segment: the parser keeps "..%20" under the CID, as today.
    expect(canonicalContentPath(`${CID}/.. ?x`)).toBe(`${CID}/..%20`);
    expect(canonicalContentPath(`${CID}/.. #x`)).toBe(`${CID}/..%20`);
  });

  it("takes linear time over a long whitespace run inside a path (a hostile case file must not freeze the page)", () => {
    const run = " ".repeat(100_000);
    const started = performance.now();
    expect(canonicalContentPath(`${CID}/a${run}b ?x`)).toBe(`${CID}/a${run}b%20`);
    expect(performance.now() - started).toBeLessThan(1000);
  });

  it("gives the same answer however many segments a path has (a 4 MiB case file holds millions)", () => {
    // A regex repeating a group per segment answered "no match" from 851,967 segments in WebKit and threw from about
    // 3,355,400 in V8 and SpiderMonkey. Node can only show the throw: 4,000,000 is past it. Compared with ===, so a
    // failure does not print 8 MB.
    const path = CID + "/a".repeat(4_000_000);
    expect(canonicalContentPath(path) === path).toBe(true);
    expect(canonicalContentPath(`/ipfs/${path}/`) === `${path}/`).toBe(true);
    expect(toHttpUrl(`ipfs://${path}#x`, GATEWAY) === `${GATEWAY}/ipfs/${path}#x`).toBe(true);
    for (const end of ["//", "//x", "/..", "/./x", "/%2e%2e"]) {
      expect(canonicalContentPath(path + end) === null, end).toBe(true);
    }
  });

  it("trims whitespace at the very start and end of the URI, as today", () => {
    expect(canonicalContentPath(`  /ipfs/${CID}/a.json \u00a0\n`)).toBe(`${CID}/a.json`);
    expect(canonicalContentPath(`\u3000${CID}/a?x \u3000`)).toBe(`${CID}/a`);
  });

  it("does not count a CID followed by whitespace as content-addressed, as today", () => {
    expect(canonicalContentPath(`${CID} ?x`)).toBeNull();
    expect(isContentAddressed(`ipfs://${CID}\u00a0#x`)).toBe(false);
  });

  it("refuses tab, LF, CR, backslash and the other control characters right before a query or fragment too", () => {
    for (const run of ["\t", "\n", "\r", "\v", "\f", "\u0000", "\u001f", "\u007f", "\\", " \t", "\t ", "\u00a0\n"]) {
      expect(canonicalContentPath(`${CID}/a${run}?x`), JSON.stringify(run)).toBeNull();
      expect(canonicalContentPath(`${CID}/a${run}#x`), JSON.stringify(run)).toBeNull();
    }
    expect(canonicalContentPath(`${CID}/a/. \n?x`)).toBeNull();
    expect(canonicalContentPath(`  /ipfs/${CID}/a.json \t#x`)).toBeNull();
  });

  it("refuses percent-encoded dots, slashes and backslashes in either case", () => {
    for (const path of [
      `${CID}/%2e%2e/x`,
      `${CID}/%2E%2E/%2e%2E/x`,
      `${CID}/.%2e/x`,
      `${CID}/%2e./x`,
      `${CID}/%2e`,
      `${CID}/file%2Epdf`,
      `${CID}/a%2fb`,
      `${CID}/a%2Fb`,
      `${CID}/a%5cb`,
      `${CID}/a%5Cb`,
    ]) {
      expect(canonicalContentPath(path), path).toBeNull();
    }
  });

  it("refuses a backslash, which the URL parser reads as a slash", () => {
    expect(canonicalContentPath(`${CID}/..\\..\\ipns\\x`)).toBeNull();
    expect(canonicalContentPath(`${CID}\\x`)).toBeNull();
    expect(canonicalContentPath(`${CID}/a\\b`)).toBeNull();
  });

  it("refuses control characters inside the path: the URL parser drops tab, LF and CR, joining '.\\t.' into '..'", () => {
    for (const control of ["\t", "\n", "\r", "\u0000", "\u0001", "\u001f", "\u007f"]) {
      expect(canonicalContentPath(`${CID}/.${control}./x`), JSON.stringify(control)).toBeNull();
      expect(canonicalContentPath(`${CID}/a${control}b`), JSON.stringify(control)).toBeNull();
    }
  });

  it("refuses empty segments inside the path and more than one trailing slash", () => {
    for (const path of [`${CID}//x`, `${CID}/a//b`, `${CID}//`, `${CID}/a//`, `${CID}///`]) {
      expect(canonicalContentPath(path), path).toBeNull();
    }
  });

  it("refuses /ipns/, full gateway URLs and anything that does not start with a whole CID", () => {
    for (const uri of [
      `/ipns/${CID}`,
      `ipns://${CID}`,
      `https://cdn.kleros.link/ipfs/${CID}`,
      `http://cdn.kleros.link/ipfs/${CID}`,
      `//ipfs/${CID}`,
      CID.slice(0, -1), // Qm + 43
      `${CID}x`, // Qm + 45
      `${CID.slice(0, -1)}0`, // 0, O, I and l are not base58
      `${CID.slice(0, -1)}O`,
      `${CID.slice(0, -1)}l`,
      `${CID.slice(0, -1)}I`,
      CIDV1.toUpperCase(), // only lowercase base32 counts (spec 02.2)
      `b${"a".repeat(49)}`,
      `${CIDV1}A`,
      `zdj7WWeQ43G6JJvLWQWZpyHuAMq6uYWRjkBXFad11vE2LHhQ7`, // base58btc CIDv1: another multibase
      "",
      "   ",
      "?x",
      "hello",
    ]) {
      expect(canonicalContentPath(uri), uri).toBeNull();
    }
  });
});

describe("isContentAddressed", () => {
  it("is exactly 'canonicalContentPath gives a path'", () => {
    for (const uri of [
      CID,
      `/ipfs/${CID}/a b.pdf`,
      `${CID}/`,
      `${CID}?x`,
      `${CID}/../x`,
      `${CID}/%2e%2e`,
      `${CID}//x`,
      `https://cdn.kleros.link/ipfs/${CID}`,
      `/ipns/${CID}`,
      "",
    ]) {
      expect(isContentAddressed(uri), uri).toBe(canonicalContentPath(uri) !== null);
    }
    expect(isContentAddressed(`/ipfs/${CID}/x.json`)).toBe(true);
    expect(isContentAddressed(`/ipfs/${CID}/../x.json`)).toBe(false);
  });
});

describe("gatewayUrl", () => {
  it("puts the path under /ipfs/ on the gateway, as written (no re-encoding)", () => {
    expect(gatewayUrl(GATEWAY, `${CID}/Court%20Policy.pdf`)).toBe(`${GATEWAY}/ipfs/${CID}/Court%20Policy.pdf`);
    expect(gatewayUrl(GATEWAY, `${CID}/a b.pdf`)).toBe(`${GATEWAY}/ipfs/${CID}/a b.pdf`);
    expect(gatewayUrl(GATEWAY, `${CID}/`)).toBe(`${GATEWAY}/ipfs/${CID}/`);
  });

  it("drops trailing slashes of the configured gateway, so the path is never '//ipfs/'", () => {
    expect(gatewayUrl(`${GATEWAY}/`, CID)).toBe(`${GATEWAY}/ipfs/${CID}`);
    expect(gatewayUrl(`${GATEWAY}//`, CID)).toBe(`${GATEWAY}/ipfs/${CID}`);
    expect(gatewayUrl("http://127.0.0.1:8080", CID)).toBe(`http://127.0.0.1:8080/ipfs/${CID}`);
  });
});

describe("toHttpUrl", () => {
  it("keeps an absolute http(s) URL, trimmed (spec 02.2)", () => {
    expect(toHttpUrl("  https://example.org/x?y#z \n", GATEWAY)).toBe("https://example.org/x?y#z");
    expect(toHttpUrl("http://example.org/x", GATEWAY)).toBe("http://example.org/x");
    expect(toHttpUrl(`https://ipfs.kleros.io/ipfs/${CID}/index.html`, GATEWAY)).toBe(
      `https://ipfs.kleros.io/ipfs/${CID}/index.html`,
    );
  });

  it("serves an IPFS URI from the gateway by its canonical path", () => {
    expect(toHttpUrl(`/ipfs/${CID}/file.pdf`, GATEWAY)).toBe(`${GATEWAY}/ipfs/${CID}/file.pdf`);
    expect(toHttpUrl(`ipfs://${CID}`, GATEWAY)).toBe(`${GATEWAY}/ipfs/${CID}`);
    expect(toHttpUrl(` ${CID}/ `, GATEWAY)).toBe(`${GATEWAY}/ipfs/${CID}/`);
  });

  it("keeps the query and fragment of an IPFS URI as written, after the checked path (spec 02.2)", () => {
    expect(toHttpUrl(`/ipfs/${CID}/index.html#/route`, GATEWAY)).toBe(`${GATEWAY}/ipfs/${CID}/index.html#/route`);
    expect(toHttpUrl(`/ipfs/${CID}/index.html?lang=en`, GATEWAY)).toBe(`${GATEWAY}/ipfs/${CID}/index.html?lang=en`);
    expect(toHttpUrl(`ipfs://${CID}/a.pdf#page=2`, GATEWAY)).toBe(`${GATEWAY}/ipfs/${CID}/a.pdf#page=2`);
    expect(toHttpUrl(`/ipfs/${CID}/a.pdf?filename=a.html#p`, GATEWAY)).toBe(
      `${GATEWAY}/ipfs/${CID}/a.pdf?filename=a.html#p`,
    );
    expect(toHttpUrl(`${CID}?x#y`, GATEWAY)).toBe(`${GATEWAY}/ipfs/${CID}?x#y`);
    expect(toHttpUrl(`${CID}/?x`, GATEWAY)).toBe(`${GATEWAY}/ipfs/${CID}/?x`);
    expect(toHttpUrl(` /ipfs/${CID}/a.pdf?x \n`, GATEWAY)).toBe(`${GATEWAY}/ipfs/${CID}/a.pdf?x`);
  });

  it("never lets the kept query or fragment change the requested path", () => {
    for (const suffix of ["?/../../x", "#/../../x", "?a\\..\\b", "?%2e%2e/x", "#\n/../x"]) {
      const url = new URL(toHttpUrl(`${CID}/a${suffix}`, GATEWAY) ?? "");
      expect(url.pathname, JSON.stringify(suffix)).toBe(`/ipfs/${CID}/a`);
    }
  });

  it("requests the file today's URL names when whitespace precedes the ? or # (spec 02.2)", () => {
    expect(toHttpUrl(`ipfs://${CID}/report ?x`, GATEWAY)).toBe(`${GATEWAY}/ipfs/${CID}/report%20?x`);
    expect(toHttpUrl(`${CID}/a\u00a0#p`, GATEWAY)).toBe(`${GATEWAY}/ipfs/${CID}/a%C2%A0#p`);
    expect(toHttpUrl(`${CID}/.. #x`, GATEWAY)).toBe(`${GATEWAY}/ipfs/${CID}/..%20#x`);
    expect(toHttpUrl(` /ipfs/${CID}/a ?x \n`, GATEWAY)).toBe(`${GATEWAY}/ipfs/${CID}/a%20?x`);
  });

  it("gives null for a blank value and for anything neither http(s) nor content-addressed", () => {
    for (const uri of [
      "",
      "  ",
      "hello",
      `/ipns/${CID}`,
      `/ipfs/${CID}/../../ipns/example.invalid`,
      `/ipfs/${CID}/%2e%2e/x`,
      `/ipfs/${CID}/..\\x`,
      `${CID}//x`,
      `/ipfs/${CID}/..?x`,
      `${CID} ?x`,
      `${CID}/a\t?x`,
      "javascript:alert(1)",
      "data:text/html,x",
      "HTTPS://example.org", // today's http test is case-sensitive, so this was an IPFS path, and it is not one
    ]) {
      expect(toHttpUrl(uri, GATEWAY), uri).toBeNull();
    }
  });
});

/**
 * What the browser requests is what matters: every path the check accepts must, once the URL parser has resolved it,
 * still name a file under /ipfs/<that CID> on the gateway, with nothing removed or added; the query and fragment
 * toHttpUrl keeps are today's, and never move the path.
 */
describe("every accepted URI is requested under its own CID", () => {
  const corpus = [...hostileCorpus(), ...whitespaceCorpus()];
  const todaysUrl = (uri: string) => new URL(today.toHttpUrl(uri) ?? "");

  it("holds over corpora of prefixes, dots, escapes, controls, slashes, whitespace and ?/#", () => {
    let accepted = 0;
    for (const uri of corpus) {
      const label = JSON.stringify(uri);
      const path = canonicalContentPath(uri);
      if (path === null) continue;
      accepted += 1;
      // A fixed point: the path, given again, is the same path (nothing left that a second pass would change).
      expect(canonicalContentPath(path), label).toBe(path);
      const cid = path.split("/")[0] ?? "";
      const pathOnly = new URL(gatewayUrl(GATEWAY, path));
      expect(pathOnly.origin, label).toBe(GATEWAY);
      expect(pathOnly.search + pathOnly.hash, label).toBe("");
      expect(pathOnly.pathname.startsWith(`/ipfs/${cid}`), label).toBe(true);
      // Same number of segments as written: no dot segment resolved away, no backslash turned into a separator.
      expect(pathOnly.pathname.split("/").length, label).toBe(`/ipfs/${path}`.split("/").length);
      // toHttpUrl requests that same path, and carries today's query and fragment (spec 02.2) on top of it.
      const url = new URL(toHttpUrl(uri, GATEWAY) ?? "");
      expect(url.origin, label).toBe(GATEWAY);
      expect(url.pathname, label).toBe(pathOnly.pathname);
      expect(url.search, label).toBe(todaysUrl(uri).search);
      expect(url.hash, label).toBe(todaysUrl(uri).hash);
    }
    expect(accepted).toBeGreaterThan(500);
    expect(corpus.length - accepted).toBeGreaterThan(5000);
  });

  it("refuses every corpus URI that today's check accepts and that the browser would resolve outside its CID", () => {
    let escapes = 0;
    for (const uri of corpus) {
      if (!today.isContentAddressed(uri)) continue;
      const cid = toIpfsPath(uri).slice(0, uri.includes(CIDV1) ? CIDV1.length : CID.length);
      if (todaysUrl(uri).pathname.startsWith(`/ipfs/${cid}`)) continue;
      escapes += 1;
      expect(canonicalContentPath(uri), JSON.stringify(uri)).toBeNull();
      expect(toHttpUrl(uri, GATEWAY), JSON.stringify(uri)).toBeNull();
    }
    // The control is not empty: today's check lets these through.
    expect(escapes).toBeGreaterThan(500);
  });
});
