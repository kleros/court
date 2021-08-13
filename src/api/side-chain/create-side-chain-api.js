import Web3 from "web3";
import KlerosLiquidExtraViews from "../../assets/contracts/kleros-liquid-extra-views.json";
import KlerosLiquid from "../../assets/contracts/kleros-liquid.json";
import TokenBridgeXDai from "../../assets/contracts/token-bridge-xdai.json";
import WrappedPinakion from "../../assets/contracts/wrapped-pinakion.json";
import XPinakion from "../../assets/contracts/x-pinakion.json";
import { getCounterPartyChainId, isSupportedSideChain } from "./chain-params";
import * as xDai from "./xdai-api";

export default async function createSideChainApi(provider) {
  const web3 = new Web3(provider);
  const chainId = await web3.eth.getChainId();

  if (!isSupportedSideChain(chainId)) {
    throw new Error(`Unsuported chain ID: ${chainId}`);
  }

  const api = xDai.createApi(xDaiParametersFactory[chainId](web3));

  return api;
}

const xDaiParametersFactory = {
  100: (web3) => {
    const contracts = {
      tokenBridge: new web3.eth.Contract(TokenBridgeXDai.abi, ensureEnv("REACT_APP_TOKEN_BRIDGE_XDAI_ADDRESS")),
      wrappedPinakion: new web3.eth.Contract(WrappedPinakion.abi, ensureEnv("REACT_APP_PINAKION_XDAI_ADDRESS")),
      xPinakion: new web3.eth.Contract(XPinakion.abi, ensureEnv("REACT_APP_RAW_PINAKION_XDAI_ADDRESS")),
      klerosLiquidExtraViews: new web3.eth.Contract(
        KlerosLiquidExtraViews.abi,
        ensureEnv("REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_XDAI_ADDRESS")
      ),
      klerosLiquid: new web3.eth.Contract(KlerosLiquid.abi, ensureEnv("REACT_APP_KLEROS_LIQUID_XDAI_ADDRESS")),
    };

    contracts.tokenBridge.options.handleRevert = true;
    contracts.wrappedPinakion.options.handleRevert = true;
    contracts.klerosLiquidExtraViews.options.handleRevert = true;
    contracts.klerosLiquid.options.handleRevert = true;

    return {
      ...contracts,
      chainId: 100,
      destinationChainId: getCounterPartyChainId(100),
    };
  },
  77: (web3) => {
    const contracts = {
      tokenBridge: new web3.eth.Contract(TokenBridgeXDai.abi, ensureEnv("REACT_APP_TOKEN_BRIDGE_SOKOL_ADDRESS")),
      wrappedPinakion: new web3.eth.Contract(WrappedPinakion.abi, ensureEnv("REACT_APP_PINAKION_SOKOL_ADDRESS")),
      xPinakion: new web3.eth.Contract(XPinakion.abi, ensureEnv("REACT_APP_RAW_PINAKION_SOKOL_ADDRESS")),
      klerosLiquidExtraViews: new web3.eth.Contract(
        KlerosLiquidExtraViews.abi,
        ensureEnv("REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_SOKOL_ADDRESS")
      ),
      klerosLiquid: new web3.eth.Contract(KlerosLiquid.abi, ensureEnv("REACT_APP_KLEROS_LIQUID_SOKOL_ADDRESS")),
    };

    contracts.tokenBridge.options.handleRevert = true;
    contracts.wrappedPinakion.options.handleRevert = true;
    contracts.klerosLiquidExtraViews.options.handleRevert = true;
    contracts.klerosLiquid.options.handleRevert = true;

    return {
      ...contracts,
      chainId: 77,
      destinationChainId: getCounterPartyChainId(77),
    };
  },
};

function ensureEnv(key, msg = `process.env.${key} is not defined`) {
  const value = process.env[key];

  if (value === "" || value === undefined || value === null) {
    throw new Error(msg);
  }

  return value;
}
