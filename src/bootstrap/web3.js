import Web3 from "web3";

let web3;

window.addEventListener("load", async () => {
  // Modern dapp browsers...
  if (window.ethereum) {
    window.web3 = new Web3(window.ethereum);
    try {
      // Request account access if needed
      await window.ethereum.enable();
      // Acccounts now exposed
    } catch (_) {
      // User denied account access...
    }
  }
  // Legacy dapp browsers...
  else if (window.web3) window.web3 = new Web3(web3.currentProvider);
});

if (typeof window !== "undefined" && typeof window.web3 !== "undefined") {
  web3 = new Web3(window.web3.currentProvider);
} else if (process.env.REACT_APP_WEB3_PROVIDER_URL) {
  // Fallback provider.
  web3 = new Web3(new Web3.providers.HttpProvider(process.env.REACT_APP_WEB3_PROVIDER_URL));
}

export default web3;
