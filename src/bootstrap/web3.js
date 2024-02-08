import Web3 from "web3";

let web3;

if (typeof window !== "undefined" && typeof window.ethereum !== "undefined") {
  web3 = new Web3(window.ethereum.currentProvider);
} else if (process.env.REACT_APP_WEB3_FALLBACK_HTTPS_URL || process.env.REACT_APP_WEB3_FALLBACK_URL) {
  // Fallback provider.
  web3 = new Web3(process.env.REACT_APP_WEB3_FALLBACK_HTTPS_URL ?? process.env.REACT_APP_WEB3_FALLBACK_URL);
} else {
  throw new Error("No fallback Web3 URL provided!");
}

export default web3;

const chainIdToRpcEndpoint = {
  1: process.env.REACT_APP_WEB3_FALLBACK_HTTPS_URL,
  5: process.env.REACT_APP_WEB3_FALLBACK_GOERLI_HTTPS_URL,
  100: process.env.REACT_APP_WEB3_FALLBACK_XDAI_HTTPS_URL,
  137: process.env.REACT_APP_WEB3_FALLBACK_POLYGON_HTTPS_URL,
  300: process.env.REACT_APP_WEB3_FALLBACK_ZKSYNCSEPOLIA_HTTPS_URL,
  10200: process.env.REACT_APP_WEB3_FALLBACK_CHIADO_HTTPS_URL,
  80001: process.env.REACT_APP_WEB3_FALLBACK_MUMBAI_HTTPS_URL,
  11155111: process.env.REACT_APP_WEB3_FALLBACK_SEPOLIA_HTTPS_URL,
};

export function getReadOnlyRpcUrl(chainId) {
  const url = chainIdToRpcEndpoint[chainId];
  if (!url) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  return url;
}

export function getReadOnlyWeb3({ chainId }) {
  return new Web3(getReadOnlyRpcUrl(chainId));
}
