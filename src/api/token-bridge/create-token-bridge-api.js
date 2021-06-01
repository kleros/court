import Web3 from "web3";
import KlerosLiquidExtraViews from "../../assets/contracts/kleros-liquid-extra-views.json";
import TokenBridgeEthereum from "../../assets/contracts/token-bridge-ethereum.json";
import TokenBridgeXDai from "../../assets/contracts/token-bridge-xdai.json";
import WrappedPinakion from "../../assets/contracts/wrapped-pinakion.json";
import Pinakion from "../../assets/contracts/pinakion.json";
import * as ethereum from "./ethereum-api";
import * as xDai from "./xdai-api";

export const supportedChains = {
  // Mainnet
  1: {
    readOnlyProviderUrl: ensureEnv("REACT_APP_WEB3_FALLBACK_URL"),
    side: "ethereum",
    counterPartyChainId: 100,
  },
  // Kovan
  42: {
    readOnlyProviderUrl: ensureEnv("REACT_APP_WEB3_FALLBACK_KOVAN_URL"),
    side: "ethereum",
    counterPartyChainId: 77,
  },
  // xDai
  100: {
    readOnlyProviderUrl: ensureEnv("REACT_APP_WEB3_FALLBACK_XDAI_URL"),
    side: "xDai",
    counterPartyChainId: 1,
  },
  // Sokol
  77: {
    readOnlyProviderUrl: ensureEnv("REACT_APP_WEB3_FALLBACK_SOKOL_URL"),
    side: "xDai",
    counterPartyChainId: 42,
  },
};

export default async function createTokenBridgeApi(provider) {
  const web3 = new Web3(provider);
  // Accounts is ignored because it's purpose is only to check whether
  // the provider can sign transactions or not.
  const [chainId, ignoredAccounts] = await Promise.all([web3.eth.getChainId(), web3.eth.requestAccounts()]);

  const chainParams = supportedChains[chainId];
  if (!chainParams) {
    throw new Error(`Unsuported chain ID: ${chainId}`);
  }

  const { counterPartyChainId } = chainParams;
  const counterPartyChainParams = supportedChains[counterPartyChainId];
  if (!counterPartyChainParams) {
    throw new Error(`Unsuported counter-party chain ID: ${counterPartyChainId} for chain ID: ${chainId}`);
  }

  const counterPartyWeb3 = new Web3(getReadOnlyProvider(counterPartyChainParams.readOnlyProviderUrl));

  return chainParams.side === "ethereum"
    ? {
        origin: ethereum.createFullApi(ethereumParametersFactory[chainId](web3)),
        destination: xDai.createReadOnlyApi(xDaiParametersFactory[counterPartyChainId](counterPartyWeb3)),
      }
    : {
        origin: xDai.createFullApi(xDaiParametersFactory[chainId](web3)),
        destination: ethereum.createReadOnlyApi(ethereumParametersFactory[counterPartyChainId](counterPartyWeb3)),
      };
}

function getReadOnlyProvider(url) {
  const JsonRpcProvider = /^wss?:\/\//.test(url) ? Web3.providers.WebsocketProvider : Web3.providers.HttpProvider;
  return new JsonRpcProvider(url);
}

const ethereumParametersFactory = {
  1: (web3) => {
    const contracts = {
      tokenBridge: new web3.eth.Contract(TokenBridgeEthereum.abi, ensureEnv("REACT_APP_TOKEN_BRIDGE_ADDRESS")),
      pinakion: new web3.eth.Contract(Pinakion.abi, ensureEnv("REACT_APP_PINAKION_ADDRESS")),
      klerosLiquidExtraViews: new web3.eth.Contract(
        KlerosLiquidExtraViews.abi,
        ensureEnv("REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_ADDRESS")
      ),
    };

    contracts.tokenBridge.options.handleRevert = true;
    contracts.pinakion.options.handleRevert = true;
    contracts.klerosLiquidExtraViews.options.handleRevert = true;

    return {
      ...contracts,
      wrappedPinakionAddress: ensureEnv("REACT_APP_TOKEN_BRIDGE_XDAI_ADDRESS"),
      chainId: 1,
    };
  },
  42: (web3) => {
    const contracts = {
      tokenBridge: new web3.eth.Contract(TokenBridgeEthereum.abi, ensureEnv("REACT_APP_TOKEN_BRIDGE_KOVAN_ADDRESS")),
      pinakion: new web3.eth.Contract(Pinakion.abi, ensureEnv("REACT_APP_PINAKION_KOVAN_ADDRESS")),
      klerosLiquidExtraViews: new web3.eth.Contract(
        KlerosLiquidExtraViews.abi,
        ensureEnv("REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_KOVAN_ADDRESS")
      ),
    };

    contracts.tokenBridge.options.handleRevert = true;
    contracts.pinakion.options.handleRevert = true;
    contracts.klerosLiquidExtraViews.options.handleRevert = true;

    return {
      ...contracts,
      wrappedPinakionAddress: ensureEnv("REACT_APP_PINAKION_SOKOL_ADDRESS"),
      chainId: 42,
    };
  },
};

const xDaiParametersFactory = {
  100: (web3) => {
    const contracts = {
      tokenBridge: new web3.eth.Contract(TokenBridgeXDai.abi, ensureEnv("REACT_APP_TOKEN_BRIDGE_XDAI_ADDRESS")),
      wrappedPinakion: new web3.eth.Contract(WrappedPinakion.abi, ensureEnv("REACT_APP_PINAKION_XDAI_ADDRESS")),
      klerosLiquidExtraViews: new web3.eth.Contract(
        KlerosLiquidExtraViews.abi,
        ensureEnv("REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_XDAI_ADDRESS")
      ),
    };

    contracts.tokenBridge.options.handleRevert = true;
    contracts.wrappedPinakion.options.handleRevert = true;
    contracts.klerosLiquidExtraViews.options.handleRevert = true;

    return {
      ...contracts,
      chainId: 100,
    };
  },
  77: (web3) => {
    const contracts = {
      tokenBridge: new web3.eth.Contract(TokenBridgeXDai.abi, ensureEnv("REACT_APP_TOKEN_BRIDGE_SOKOL_ADDRESS")),
      wrappedPinakion: new web3.eth.Contract(WrappedPinakion.abi, ensureEnv("REACT_APP_PINAKION_SOKOL_ADDRESS")),
      klerosLiquidExtraViews: new web3.eth.Contract(
        KlerosLiquidExtraViews.abi,
        ensureEnv("REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_SOKOL_ADDRESS")
      ),
    };

    contracts.tokenBridge.options.handleRevert = true;
    contracts.wrappedPinakion.options.handleRevert = true;
    contracts.klerosLiquidExtraViews.options.handleRevert = true;

    return {
      ...contracts,
      chainId: 77,
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
