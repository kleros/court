import Web3 from "web3";
import { getSideChainParams, isSupportedSideChain } from "./chain-params";

const { toHex } = Web3.utils;

export default async function requestSwitchChain(provider, destinationChainId) {
  try {
    return await switchChain(provider, { chainId: destinationChainId });
  } catch (err) {
    // This error code indicates that the chain has not been added to MetaMask
    // if it is not, then add it into the user MetaMask
    if (err.code === 4902 && isSupportedSideChain(destinationChainId)) {
      return await addChain(provider, getSideChainParams(destinationChainId));
    }

    throw err;
  }
}

async function addChain(provider, { chainId, chainName, nativeCurrency, rpcUrls, blockExplorerUrls }) {
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

async function switchChain(provider, { chainId }) {
  return await provider.request({
    method: "wallet_switchEthereumChain",
    params: [
      {
        chainId: toHex(chainId),
      },
    ],
  });
}
