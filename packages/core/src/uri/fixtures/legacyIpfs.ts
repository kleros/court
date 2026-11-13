/*
 * Today's app, for the differential test only: a copy of legacy/src/utils/ipfs.js (= court master 6df637a
 * src/utils/ipfs.js, sha256 8c65ef49fdf85a353282554b1a31badd3f91be83331aa816016305c6e8e3e10c). The code below is that
 * file verbatim except for three parameter types (`uri: string`, `uri: unknown`, `uri: unknown`), added so it
 * type-checks here; core imports only .ts files.
 */
export const IPFS_GATEWAY = "https://cdn.kleros.link";

//CID shape check for CIDv0 and CIDv1 in base32 (the standard's default encoding).
const CID_REGEX = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{50,})([/?#]|$)/;

//Strips the common IPFS URI prefixes, leaving only the CID or CID/path.
export const toIpfsPath = (uri: string) =>
  uri
    .trim()
    .replace(/^(?:ipfs:|fs:)\/*/, "")
    .replace(/^\/?(?:ipfs\/)?/, "");

//Resolves a URI to an HTTP URL.
//IPFS URIs in any of their common forms resolve to the Kleros gateway. Absolute http(s) URLs are returned unchanged.
export const toHttpUrl = (uri: unknown) => {
  if (typeof uri !== "string" || uri.trim() === "") return undefined;
  if (/^https?:\/\//.test(uri.trim())) return uri.trim();
  return `${IPFS_GATEWAY}/ipfs/${toIpfsPath(uri)}`;
};

//Evidence type URIs must be content-addressed.
export const isContentAddressed = (uri: unknown) => typeof uri === "string" && CID_REGEX.test(toIpfsPath(uri));
