import createSwitchToSideChain from "./create-switch-to-side-chain";
import { getSideChainParamsFromMainChainId } from "./chain-params";

export { SideChainApiProvider, useSideChainApi } from "./react-adapters";
export * from "./chain-params";

export const requestSwitchToSideChain = createSwitchToSideChain({
  getCounterPartyChainParams: getSideChainParamsFromMainChainId,
});
