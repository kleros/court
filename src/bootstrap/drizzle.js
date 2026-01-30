import { Drizzle, generateStore } from "@drizzle/store";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import Web3 from "web3";
import Kleros from "../assets/contracts/kleros.json";
import KlerosLiquid from "../assets/contracts/kleros-liquid.json";
import KlerosLiquidExtraViews from "../assets/contracts/kleros-liquid-extra-views.json";
import Pinakion from "../assets/contracts/pinakion.json";
import PolicyRegistry from "../assets/contracts/policy-registry.json";
import UniswapV2Factory from "../assets/contracts/uniswap-v2-factory.json";
import UniswapV2Router02 from "../assets/contracts/uniswap-v2-router-02.json";

const defaultOptions = {
  networkWhitelist: [
    1, // Mainnet
    100, // xDAI
    10200, // Chiado
    11155111, // Sepolia
  ],
  contracts: [
    {
      ...Kleros,
      networks: {
        1: { address: process.env.REACT_APP_KLEROS_ADDRESS },
        100: { address: process.env.REACT_APP_KLEROS_XDAI_ADDRESS },
        10200: { address: "0x00000000219ab540356cbb839cbe05303d7705fa" }, // Dummy address for coping with Drizzle errors.
        11155111: { address: "0x00000000219ab540356cbb839cbe05303d7705fa" }, // Dummy address for coping with Drizzle errors.
      },
    },
    {
      ...KlerosLiquid,
      networks: {
        1: { address: process.env.REACT_APP_KLEROS_LIQUID_ADDRESS },
        100: { address: process.env.REACT_APP_KLEROS_LIQUID_XDAI_ADDRESS },
        10200: { address: process.env.REACT_APP_KLEROS_LIQUID_CHIADO_ADDRESS },
        11155111: { address: process.env.REACT_APP_KLEROS_LIQUID_SEPOLIA_ADDRESS },
      },
    },
    {
      ...KlerosLiquidExtraViews,
      networks: {
        1: { address: process.env.REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_ADDRESS },
        100: { address: process.env.REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_XDAI_ADDRESS },
        10200: { address: process.env.REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_CHIADO_ADDRESS },
        11155111: { address: process.env.REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_SEPOLIA_ADDRESS },
      },
    },
    {
      ...Pinakion,
      networks: {
        1: { address: process.env.REACT_APP_PINAKION_ADDRESS },
        100: { address: process.env.REACT_APP_PINAKION_XDAI_ADDRESS },
        10200: { address: process.env.REACT_APP_PINAKION_CHIADO_ADDRESS },
        11155111: { address: process.env.REACT_APP_PINAKION_SEPOLIA_ADDRESS },
      },
    },
    {
      ...PolicyRegistry,
      networks: {
        1: { address: process.env.REACT_APP_POLICY_REGISTRY_ADDRESS },
        100: { address: process.env.REACT_APP_POLICY_REGISTRY_XDAI_ADDRESS },
        10200: { address: process.env.REACT_APP_POLICY_REGISTRY_CHIADO_ADDRESS },
        11155111: { address: process.env.REACT_APP_POLICY_REGISTRY_SEPOLIA_ADDRESS },
      },
    },
    {
      ...UniswapV2Factory,
      networks: {
        1: { address: process.env.REACT_APP_UNISWAP_V2_FACTORY_ADDRESS },
        100: { address: process.env.REACT_APP_UNISWAP_V2_FACTORY_XDAI_ADDRESS },
        10200: { address: "0x00000000219ab540356cbb839cbe05303d7705fa" }, // Dummy address for coping with Drizzle errors.
        11155111: { address: "0x00000000219ab540356cbb839cbe05303d7705fa" }, // Dummy address for coping with Drizzle errors.
      },
    },
    {
      ...UniswapV2Router02,
      networks: {
        1: { address: process.env.REACT_APP_UNISWAP_V2_ROUTER_02_ADDRESS },
        100: { address: process.env.REACT_APP_UNISWAP_V2_ROUTER_02_XDAI_ADDRESS },
        10200: { address: "0x00000000219ab540356cbb839cbe05303d7705fa" }, // Dummy address for coping with Drizzle errors.
        11155111: { address: "0x00000000219ab540356cbb839cbe05303d7705fa" }, // Dummy address for coping with Drizzle errors.
      },
    },
  ],
  polls: {
    accounts: 3000,
    blocks: 3000,
  },
};

const chainIdToFallbackUrl = {
  1: process.env.REACT_APP_WEB3_FALLBACK_URL,
  100: process.env.REACT_APP_WEB3_FALLBACK_XDAI_URL,
  10200: process.env.REACT_APP_WEB3_FALLBACK_CHIADO_URL,
  11155111: process.env.REACT_APP_WEB3_FALLBACK_SEPOLIA_URL,
};

const { DrizzleProvider, Initializer, useDrizzle } = drizzleReactHooks;

export { DrizzleProvider, Initializer, useDrizzle };

function createDrizzle({ fallbackChainId, customProvider } = {}) {
  let web3Instance;

  if (customProvider) {
    web3Instance = customProvider instanceof Web3 ? customProvider : new Web3(customProvider);
  } else {
    const fallbackUrl = chainIdToFallbackUrl[fallbackChainId];
    if (fallbackUrl) {
      web3Instance = new Web3(fallbackUrl);
    }
  }

  const options = web3Instance ? { ...defaultOptions, web3: { customProvider: web3Instance } } : { ...defaultOptions };

  return new Drizzle(options, generateStore(options));
}

/**
 * Workaround to allow non-web3 browsers to connect to the right chain
 * when `requiredChainId` query string param is set.
 *
 * Multi-chain support requires e-mail include to notifications include
 * such param in links to make sure the user will be redirected to the
 * right case on the right network.
 *
 * If the user e-mail client opens the link in a browser that is not
 * web3-ready, this will guarantee that the Drizzle fallback URL points
 * them to the right network.
 *
 * We store the value on LocalStorage to keep connected to the right
 * network in case the user navigates away from the URL it arrived to
 * and then refresh the page.
 *
 * Users with web3 support will not be affected.
 */
const STORAGE_KEY = "@@kleros/court/fallback-chain-id";
const DEFAULT_FALLBACK_CHAIN_ID = 1;

const extractFromQueryString = (param, search) => {
  if (typeof URLSearchParams !== "function") {
    const regex = new RegExp(`(\\?:\\\\?|&)?${param}=([^&]*)`);
    const matches = regex.exec(search);
    return matches ? matches[1] : undefined;
  }

  const params = new URLSearchParams(search);
  return params.get(param);
};

const detectRequiredChainId = () => {
  const fromStorage = Number.parseInt(window?.localStorage?.getItem(STORAGE_KEY), 10);
  const fromQueryString = Number.parseInt(
    extractFromQueryString("requiredChainId", window?.location?.search ?? ""),
    10
  );

  const chainId = !Number.isNaN(fromQueryString)
    ? fromQueryString
    : !Number.isNaN(fromStorage)
    ? fromStorage
    : DEFAULT_FALLBACK_CHAIN_ID;

  if (Number.isNaN(fromStorage) || fromStorage !== fromQueryString) {
    window.localStorage.setItem(STORAGE_KEY, chainId);
  }

  return chainId;
};

export { createDrizzle, detectRequiredChainId };
