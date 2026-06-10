function parseUrl(url) {
  if (!url || typeof url !== "string") return null;
  try {
    return new URL(url.trim());
  } catch {
    return null;
  }
}

// Only https is allowed, rejects javascript:, data:, vbscript:, file:, etc.
export function isSafeNavigationUrl(url) {
  return parseUrl(url)?.protocol === "https:";
}
