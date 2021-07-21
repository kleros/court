import createWatchToken from "./create-watch-token";
import { getSideChainParams } from "./chain-params";

export { SideChainApiProvider, useSideChainApi } from "./react-adapters";
export * from "./chain-params";

export { default as requestSwitchNetwork } from "./request-switch-network";

export const requestWatchToken = createWatchToken({
  getChainParams: getSideChainParams,
});
