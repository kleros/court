import Web3 from "web3";
import { MAINNET, getFallbackHttpsUrl, getUrl } from "../helpers/networks";

let web3;

if (typeof window !== "undefined" && typeof window.ethereum !== "undefined") {
  web3 = new Web3(window.ethereum.currentProvider);
} else if (getUrl(MAINNET)) {
  // Fallback provider.
  web3 = new Web3(getUrl(MAINNET));
} else {
  throw new Error("No fallback Web3 URL provided!");
}

export default web3;

export function getReadOnlyRpcUrl(chainId) {
  const url = getFallbackHttpsUrl(chainId);
  if (!url) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  return url;
}

export function getReadOnlyWeb3({ chainId }) {
  return new Web3(getReadOnlyRpcUrl(chainId));
}
