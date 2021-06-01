import createTokenBridgeApi, { supportedChains } from "./create-token-bridge-api";
export { TokenBridgeApiProvider, useTokenBridgeApi } from "./react-adapters";

export default createTokenBridgeApi;

export const counterPartyChainIdMap = Object.fromEntries(
  Object.entries(supportedChains).map(([key, { counterPartyChainId }]) => [key, counterPartyChainId])
);
