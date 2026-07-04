const CDN_URL = "https://cdn.kleros.link";

const toIpfsPath = (uri) => {
  if (uri.startsWith("/ipfs/")) return uri;
  if (uri.startsWith("ipfs/")) return `/ipfs/${uri.slice("ipfs/".length)}`;

  return `/ipfs/${uri.replace(/^\/+/, "")}`;
};

export const normalizeIpfsUri = (uri) => {
  if (!uri || typeof uri !== "string") return uri;

  uri = uri.trim();

  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;

  if (uri.startsWith("ipfs:")) {
    return `${CDN_URL}${toIpfsPath(uri.replace(/^ipfs:(\/\/?)/, ""))}`;
  }

  if (uri.startsWith("/ipfs/") || uri.startsWith("ipfs/")) {
    return `${CDN_URL}${toIpfsPath(uri)}`;
  }

  return uri;
};
