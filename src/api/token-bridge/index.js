import createTokenBridgeApi, { supportedChains } from "./create-token-bridge-api";
export { TokenBridgeApiProvider, useTokenBridgeApi } from "./react-adapters";

export default createTokenBridgeApi;

export const counterPartyChainIdMap = Object.fromEntries(
  Object.entries(supportedChains).map(([key, { counterPartyChainId }]) => [key, counterPartyChainId])
);

export const isSupportedSideChain = (chainId) => supportedChains[chainId]?.side === "xDai";

export const isSupportedMainChain = (chainId) => supportedChains[chainId]?.side === "ethereum";

export const isSupportedChain = (chainId) => isSupportedSideChain(chainId) || isSupportedMainChain(chainId);
