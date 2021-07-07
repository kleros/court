import createSwitchToSideChain from "./create-switch-to-side-chain";
import createWatchToken from "./create-watch-token";
import { getSideChainParamsFromMainChainId, getSideChainParams } from "./chain-params";

export { SideChainApiProvider, useSideChainApi } from "./react-adapters";
export * from "./chain-params";

export const requestSwitchToSideChain = createSwitchToSideChain({
  getCounterPartyChainParams: getSideChainParamsFromMainChainId,
});

export const requestWatchToken = createWatchToken({
  getChainParams: getSideChainParams,
});
