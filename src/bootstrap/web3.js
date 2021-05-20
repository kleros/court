import Web3 from "web3";

let web3;

window.document.addEventListener("DOMContentLoaded", async () => {
  // Modern dapp browsers...
  if (window.ethereum) {
    window.web3 = new Web3(window.ethereum);
    try {
      // Request account access if needed
      await window.ethereum.send("eth_requestAccounts");
      // Acccounts now exposed
    } catch (_) {
      // User denied account access...
    }
  } else if (window.web3) {
    // Legacy dapp browsers...
    window.web3 = new Web3(web3.currentProvider);
  }
});

if (typeof window !== "undefined" && typeof window.web3 !== "undefined") {
  web3 = new Web3(window.web3.currentProvider);
} else if (process.env.REACT_APP_WEB3_PROVIDER_URL) {
  // Fallback provider.
  web3 = new Web3(new Web3.providers.HttpProvider(process.env.REACT_APP_WEB3_PROVIDER_URL));
}

export default web3;

const chainIdToEndpoint = {
  1: process.env.REACT_APP_WEB3_FALLBACK_URL,
  3: process.env.REACT_APP_WEB3_FALLBACK_ROPSTEN_URL,
  42: process.env.REACT_APP_WEB3_FALLBACK_KOVAN_URL,
  77: process.env.REACT_APP_WEB3_FALLBACK_SOKOL_URL,
};

export function getReadOnlyWeb3(chainId) {
  const endpoint = chainIdToEndpoint[chainId];

  if (!endpoint) {
    throw new Error(`Unsupported network: ${chainId}`);
  }

  const JsonRpcProvider = /^ws/.test(endpoint) ? Web3.providers.WebsocketProvider : Web3.providers.HttpProvider;

  return new Web3(new JsonRpcProvider(endpoint));
}
