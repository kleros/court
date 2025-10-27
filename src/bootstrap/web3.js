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
  10: process.env.REACT_APP_WEB3_FALLBACK_OPTIMISM_HTTPS_URL,
  100: process.env.REACT_APP_WEB3_FALLBACK_XDAI_HTTPS_URL,
  130: process.env.REACT_APP_WEB3_FALLBACK_UNICHAIN_HTTPS_URL,
  137: process.env.REACT_APP_WEB3_FALLBACK_POLYGON_HTTPS_URL,
  300: process.env.REACT_APP_WEB3_FALLBACK_ZKSYNCSEPOLIA_HTTPS_URL,
  324: process.env.REACT_APP_WEB3_FALLBACK_ZKSYNC_HTTPS_URL,
  690: process.env.REACT_APP_WEB3_FALLBACK_REDSTONE_HTTPS_URL,
  1301: process.env.REACT_APP_WEB3_FALLBACK_UNICHAINSEPOLIA_HTTPS_URL,
  10200: process.env.REACT_APP_WEB3_FALLBACK_CHIADO_HTTPS_URL,
  80001: process.env.REACT_APP_WEB3_FALLBACK_MUMBAI_HTTPS_URL,
  42161: process.env.REACT_APP_WEB3_FALLBACK_ARBITRUM_HTTPS_URL,
  421614: process.env.REACT_APP_WEB3_FALLBACK_ARBITRUMSEPOLIA_HTTPS_URL,
  11155111: process.env.REACT_APP_WEB3_FALLBACK_SEPOLIA_HTTPS_URL,
  11155420: process.env.REACT_APP_WEB3_FALLBACK_OPTIMISMSEPOLIA_HTTPS_URL,
  8453: process.env.REACT_APP_WEB3_FALLBACK_BASE_HTTPS_URL,
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
