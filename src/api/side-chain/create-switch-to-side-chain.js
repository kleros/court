import Web3 from "web3";

const { toHex } = Web3.utils;

export default function createSwitchToSideChain({ getCounterPartyChainParams }) {
  return async function requestSwitchToSideChain(provider) {
    const chainId = Number.parseInt(
      await provider.request({
        method: "eth_chainId",
      }),
      16
    );
    const chainParams = getCounterPartyChainParams(chainId);

    return await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: toHex(chainParams.chainId),
          chainName: chainParams.chainName,
          nativeCurrency: chainParams.nativeCurrency,
          rpcUrls: chainParams.rpcUrls,
          blockExplorerUrls: chainParams.blockExplorerUrls,
        },
      ],
    });
  };
}
