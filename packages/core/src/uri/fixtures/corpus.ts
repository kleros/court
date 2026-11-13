/** Test values the uri tests share: the CIDs, the gateway, and two generated corpora of hostile IPFS URIs. */

// A CIDv0 directory from today's Gnosis script allowlist, and a base32 CIDv1.
export const CID = "QmRnwMuc7kGipQkjzPY9jhcttRhebPRYwEvBVGTjmkMwe9";
export const CIDV1 = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
export const GATEWAY = "https://cdn.kleros.link";

const PREFIXES = ["", "ipfs://", "/ipfs/", "ipfs/", "fs:/"];
const SEGMENTS = [
  "..",
  ".",
  ".. ",
  ". ",
  "..\u00a0",
  "...",
  "x",
  "",
  "a b",
  "%20",
  "%2e%2e",
  "%2E%2e",
  ".%2e",
  "%2e.",
  "%252e%252e",
  ".\t.",
  ".\n.",
  ".\r.",
  ".\u0000.",
  String.raw`..\..`,
  "a%2fb",
  "a%5cb",
  "．．",
];
const SUFFIXES = [
  "",
  "/",
  "?x",
  "#x",
  "?/../../y",
  "#/../y",
  "/?x",
  String.raw`?a\..\b`,
  "?\t/../y",
  "#\n/../y",
  "?%2e%2e/x",
  "?x#y",
];

/** What follows a CID: one or two segments of dots, escapes, controls and slashes, then a path end or ?/#. */
function hostileTails(): string[] {
  const tails: string[] = [];
  for (const first of SEGMENTS) {
    for (const second of ["", ...SEGMENTS]) {
      const path = second === "" ? first : `${first}/${second}`;
      for (const suffix of SUFFIXES) tails.push(`${path}${suffix}`);
    }
  }
  return tails;
}

/** Every prefix and CID, then one or two segments of dots, escapes, controls and slashes, then a path end or ?/#. */
export function hostileCorpus(): string[] {
  const tails = hostileTails();
  const corpus: string[] = [];
  for (const prefix of PREFIXES) {
    for (const cid of [CID, CIDV1]) {
      for (const tail of tails) corpus.push(`${prefix}${cid}/${tail}`);
    }
  }
  return corpus;
}

/** Every character JavaScript's trim() removes (\s): ASCII space and controls, NBSP, the Unicode spaces, U+3000, BOM. */
const WHITESPACE = Array.from({ length: 0x10000 }, (_, code) => String.fromCodePoint(code)).filter((char) =>
  /\s/.test(char),
);

const WHITESPACE_RUNS = [...WHITESPACE, "  ", " \u00a0", "\u00a0 ", "\u3000 \u3000", " \t", "\t ", "\u00a0\n"];
const PATHS = ["", "/", "/report", "/a b", "/a\u00a0b", "/..", "/.", "/x/..", "/%2e%2e", "/a%20"];
const PLACES: ((uri: string, run: string) => string)[] = [
  (uri, run) => `${uri}${run}?x`,
  (uri, run) => `${uri}${run}#x`,
  (uri, run) => `${uri}${run}?x#y`,
  (uri, run) => `${uri}${run}?`,
  (uri, run) => `${uri}${run}#/../y`,
  (uri, run) => `${uri}${run}/z?x`,
  (uri, run) => `${uri}?${run}x`,
  (uri, run) => `${uri}#x${run}y`,
  (uri, run) => `${uri}?x${run}`,
  (uri, run) => `${uri}${run}`,
  (uri, run) => `${run}${uri}?x`,
];

/** Every whitespace run right before, inside and after a ? or #, at the start, and at the end, after CID paths. */
export function whitespaceCorpus(): string[] {
  const corpus: string[] = [];
  for (const prefix of ["", "ipfs://", "/ipfs/"])
    for (const cid of [CID, CIDV1])
      for (const path of PATHS)
        for (const run of WHITESPACE_RUNS)
          for (const place of PLACES) corpus.push(place(`${prefix}${cid}${path}`, run));
  return corpus;
}
