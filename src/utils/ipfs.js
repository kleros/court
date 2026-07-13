export const IPFS_GATEWAY = "https://cdn.kleros.link";

//CID shape check for CIDv0 and CIDv1 in base32 (the standard's default encoding).
const CID_REGEX = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{50,})([/?#]|$)/;

//Strips the common IPFS URI prefixes, leaving only the CID or CID/path.
const toIpfsPath = (uri) =>
  uri
    .trim()
    .replace(/^(?:ipfs:|fs:)\/*/, "")
    .replace(/^\/?(?:ipfs\/)?/, "");

//Resolves a URI to an HTTP URL.
//IPFS URIs in any of their common forms resolve to the Kleros gateway. Absolute http(s) URLs are returned unchanged.
export const toHttpUrl = (uri) => {
  if (typeof uri !== "string" || uri.trim() === "") return undefined;
  if (/^https?:\/\//.test(uri.trim())) return uri.trim();
  return `${IPFS_GATEWAY}/ipfs/${toIpfsPath(uri)}`;
};

//Evidence type URIs must be content-addressed.
export const isContentAddressed = (uri) => typeof uri === "string" && CID_REGEX.test(toIpfsPath(uri));
