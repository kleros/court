import Web3 from "web3";

let web3;

if (typeof window !== "undefined" && typeof window.web3 !== "undefined") {
  web3 = new Web3(window.web3.currentProvider);
} else if (process.env.REACT_APP_WEB3_FALLBACK_HTTPS_URL || process.env.REACT_APP_WEB3_FALLBACK_URL) {
  // Fallback provider.
  web3 = new Web3(process.env.REACT_APP_WEB3_FALLBACK_HTTPS_URL ?? process.env.REACT_APP_WEB3_FALLBACK_URL);
} else {
  throw new Error("No fallback Web3 URL provided!");
}

export default web3;

const chainIdToRpcEndpoint = {
  1: process.env.REACT_APP_WEB3_FALLBACK_HTTPS_URL,
  3: process.env.REACT_APP_WEB3_FALLBACK_ROPSTEN_HTTPS_URL,
  4: process.env.REACT_APP_WEB3_FALLBACK_RINKEBY_HTTPS_URL,
  42: process.env.REACT_APP_WEB3_FALLBACK_KOVAN_HTTPS_URL,
  77: process.env.REACT_APP_WEB3_FALLBACK_SOKOL_HTTPS_URL,
  100: process.env.REACT_APP_WEB3_FALLBACK_XDAI_HTTPS_URL,
};

export function getReadOnlyRpcUrl({ chainId }) {
  const url = chainIdToRpcEndpoint[chainId];
  if (!url) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  return url;
}

export function getReadOnlyWeb3({ chainId }) {
  return new Web3(getReadOnlyRpcUrl({ chainId }));
}
