/*
 * Today's app, for the differential test only: a copy of legacy/src/utils/urlValidation.js (= court master 6df637a
 * src/utils/urlValidation.js, sha256 91380dd223d75975a4a22cd682f1b5f9e4c8a43a9f5017a198984bccff2cf478). The code below
 * is that file verbatim except for two parameter types (`url: unknown`, `url: unknown`), added so it type-checks here;
 * core imports only .ts files.
 */
function parseUrl(url: unknown) {
  if (!url || typeof url !== "string") return null;
  try {
    return new URL(url.trim());
  } catch {
    return null;
  }
}

// Only https is allowed, rejects javascript:, data:, vbscript:, file:, etc.
export function isSafeNavigationUrl(url: unknown) {
  return parseUrl(url)?.protocol === "https:";
}
