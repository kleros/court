/** Max trimmed `.length` the URL parser is given: a long non-ASCII host blocks WebKit's page while it parses (P73). */
export const URL_PARSE_BOUND = 8192;

/**
 * True only for a string that, trimmed, is at most URL_PARSE_BOUND long and parses as a URL with protocol `https:`
 * (spec 02.2, P73): no http, javascript or data.
 */
export function isSafeNavigationUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (trimmed.length > URL_PARSE_BOUND) return false;
  try {
    return new URL(trimmed).protocol === "https:";
  } catch {
    return false;
  }
}
