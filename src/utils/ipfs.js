export const IPFS_GATEWAY = "https://cdn.kleros.link";

//Resolves a URI to an HTTP URL.
//IPFS URIs in any of their common forms resolve to the Kleros gateway. Absolute http(s) URLs are returned unchanged.
export const toHttpUrl = (uri) => {
  if (typeof uri !== "string" || uri === "") return uri;
  if (/^https?:\/\//.test(uri)) return uri;
  const path = uri.replace(/^(?:ipfs:|fs:)\/*/, "").replace(/^\/?(?:ipfs\/)?/, "");
  return `${IPFS_GATEWAY}/ipfs/${path}`;
};

//Evidence type URIs must be content-addressed.
export const isContentAddressed = (uri) => typeof uri === "string" && /^(\/?ipfs\/|ipfs:|fs:\/*ipfs\/)/.test(uri);
