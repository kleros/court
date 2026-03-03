import { CHAIN_ID_TO_REALITY_ADDRESSES } from "../temp/reality-addresses";

function isRealitioCase(chainId, arbitrated) {
  const addresses = CHAIN_ID_TO_REALITY_ADDRESSES[chainId];
  if (!addresses || !arbitrated) return false;
  return addresses.includes(String(arbitrated).toLowerCase());
}

export function getRtALabel(chainId, arbitrated) {
  return isRealitioCase(chainId, arbitrated) ? "Invalid" : "Refuse to Arbitrate";
}
