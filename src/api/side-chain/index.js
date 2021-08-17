import createWatchToken from "./create-watch-token";
import { getSideChainParams } from "./chain-params";

export { SideChainApiProvider, useSideChainApi } from "./react-adapters";
export * from "./chain-params";

export { default as requestSwitchChain } from "./request-switch-chain";

export const requestWatchToken = createWatchToken({
  getChainParams: getSideChainParams,
});
