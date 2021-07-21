import Web3 from "web3";
import { getSideChainParams, isSupportedSideChain } from "./chain-params";

const { toHex } = Web3.utils;

export default async function requestSwitchNetwork(provider, destinationChainId) {
  try {
    return await switchNetwork(provider, { chainId: destinationChainId });
  } catch (err) {
    // This error code indicates that the chain has not been added to MetaMask
    // if it is not, then add it into the user MetaMask
    if (err.code === 4902 && isSupportedSideChain(destinationChainId)) {
      return await addNetwork(provider, getSideChainParams(destinationChainId));
    }

    throw err;
  }
}

async function addNetwork(provider, { chainId, chainName, nativeCurrency, rpcUrls, blockExplorerUrls }) {
  return await provider.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: toHex(chainId),
        chainName: chainName,
        nativeCurrency: nativeCurrency,
        rpcUrls: rpcUrls,
        blockExplorerUrls: blockExplorerUrls,
      },
    ],
  });
}

async function switchNetwork(provider, { chainId }) {
  return await provider.request({
    method: "wallet_switchEthereumChain",
    params: [
      {
        chainId: toHex(chainId),
      },
    ],
  });
}
