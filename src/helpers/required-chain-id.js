//Points the `requiredChainId` query param to the `chainID`, if it is present.
export function withRequiredChainId(url, chainId) {
  const parsed = new URL(url);
  if (!parsed.searchParams.has("requiredChainId")) {
    return url;
  }
  parsed.searchParams.set("requiredChainId", String(chainId));
  return parsed.toString();
}
