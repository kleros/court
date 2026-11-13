/**
 * IPFS URIs as case files, scripts, displays, evidence and policies give them (spec 02.2). The one content-addressing
 * rule of the app is canonicalContentPath: everything that must be immutable goes through it, and every path requested
 * from the gateway is its result.
 */

/** A whole CIDv0 (Qm + 44 base58) or lowercase base32 CIDv1 (b + at least 50), today's two shapes. */
const CID = "(?:Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{50,})";

/** The CID as the whole first segment: followed by a `/` or by nothing. */
const STARTS_WITH_CID = new RegExp(`^${CID}(?:/|$)`);

/**
 * Characters the URL parser removes or turns into a separator: it drops tab, LF and CR anywhere (".\t." becomes ".."),
 * and reads a backslash as "/". Other C0 controls and DEL have no place in a file name either.
 */
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const PARSER_REWRITES = /[\u0000-\u001f\u007f\\]/;

/** Encoded dot, slash and backslash: a parser or gateway that decodes them could rebuild a dot segment or separator. */
const ENCODED_DOT_OR_SEPARATOR = /%(?:2e|2f|5c)/i;

/** Today's prefix strip, unchanged: an `ipfs:`/`fs:` scheme with its slashes, then one `/` and one `ipfs/`. */
export function toIpfsPath(uri: string): string {
  return uri
    .trim()
    .replace(/^(?:ipfs:|fs:)\/*/, "")
    .replace(/^\/?(?:ipfs\/)?/, "");
}

/** Where the query or fragment starts (the first `?` or `#`), or the length when there is neither. */
function pathEnd(uri: string): number {
  const end = uri.search(/[?#]/);
  return end === -1 ? uri.length : end;
}

/**
 * `CID[/segments][/]` as the gateway is asked for it, or null when the URI is not content-addressed. As today, the URI
 * is trimmed at both ends and the path ends at the first `?` or `#`; the query and fragment are not part of the address
 * and are left out (toHttpUrl puts them back on the URL a person opens). Whitespace right before that `?` or `#` is part
 * of the file name, as today (`CID/report ?x` asks for "report "), and comes back percent-encoded as the URL parser
 * sends it (`CID/report%20`): raw at the end of a path, a second check would trim it and the parser would drop it. The
 * path is refused, not repaired, when the browser would request something else than it says: a `.` or `..` segment,
 * an encoded dot or separator, a character the parser rewrites or a control character (right before the `?` or `#`
 * too), or an empty segment inside it.
 */
export function canonicalContentPath(uri: string): string | null {
  const ipfsPath = toIpfsPath(uri);
  // Checked with its "?x", "CID/..?x" would pass, and the parser resolves it to "/ipfs/": cut before checking.
  const path = ipfsPath.slice(0, pathEnd(ipfsPath));
  if (PARSER_REWRITES.test(path) || ENCODED_DOT_OR_SEPARATOR.test(path)) return null;
  // The CID, then non-empty segments, then at most ONE trailing slash (the Gnosis script entry `QmRnw…/` needs it): no
  // "//" anywhere. Not one regex repeating a group per segment: engines give up or throw on a path of many segments.
  if (!STARTS_WITH_CID.test(path) || path.includes("//")) return null;
  if (path.split("/").some((segment) => segment === "." || segment === "..")) return null;
  // trimEnd, not /\s+$/: the regex retries from every space of a long run inside the path (quadratic).
  const kept = path.trimEnd();
  return kept + encodeURIComponent(path.slice(kept.length));
}

export function isContentAddressed(uri: string): boolean {
  return canonicalContentPath(uri) !== null;
}

/** A loop, not /\/+$/: that regex retries from every slash of a long run (quadratic). */
function withoutTrailingSlashes(value: string): string {
  let end = value.length;
  // charCodeAt on purpose: the loop steps back one UTF-16 code unit at a time, and "/" is one unit.
  while (end > 0 && value.charCodeAt(end - 1) === 0x2f) end -= 1; // NOSONAR
  return value.slice(0, end);
}

/**
 * The gateway URL of a path from canonicalContentPath, concatenated as written (a `%20` stays `%20`). The configured
 * gateway's trailing slashes are dropped so the path is never `//ipfs/`.
 */
export function gatewayUrl(gateway: string, path: string): string {
  return `${withoutTrailingSlashes(gateway)}/ipfs/${path}`;
}

/**
 * An absolute http(s) URL as given (trimmed; today's case-sensitive test), else the gateway URL of the canonical path
 * followed by the URI's own query and fragment as written (spec 02.2 keeps them: `#page=`, `#/route`, `?lang=`; the
 * URL parser never reads them as path, so the checked path is what is requested), else null: a blank value or
 * anything that is not content-addressed never becomes a gateway URL.
 */
export function toHttpUrl(uri: string, gateway: string): string | null {
  const trimmed = uri.trim();
  if (/^https?:\/\//.test(trimmed)) return trimmed;
  const path = canonicalContentPath(trimmed);
  return path === null ? null : gatewayUrl(gateway, path) + trimmed.slice(pathEnd(trimmed));
}
