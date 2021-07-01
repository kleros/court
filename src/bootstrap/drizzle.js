import { Drizzle, generateStore } from "@drizzle/store";
import { drizzleReactHooks } from "@drizzle/react-plugin";
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
    3, // Ropsten
    42, // Kovan
    77, // Sokol
    100, // xDAI
  ],
  contracts: [
    {
      ...Kleros,
      networks: {
        1: { address: process.env.REACT_APP_KLEROS_ADDRESS },
        3: { address: "0x00000000219ab540356cbb839cbe05303d7705fa" },
        42: { address: process.env.REACT_APP_KLEROS_KOVAN_ADDRESS },
        77: { address: process.env.REACT_APP_KLEROS_SOKOL_ADDRESS },
        100: { address: process.env.REACT_APP_KLEROS_XDAI_ADDRESS },
      },
    },
    {
      ...KlerosLiquid,
      networks: {
        1: { address: process.env.REACT_APP_KLEROS_LIQUID_ADDRESS },
        3: { address: process.env.REACT_APP_KLEROS_LIQUID_ROPSTEN_ADDRESS },
        42: { address: process.env.REACT_APP_KLEROS_LIQUID_KOVAN_ADDRESS },
        77: { address: process.env.REACT_APP_KLEROS_LIQUID_SOKOL_ADDRESS },
        100: { address: process.env.REACT_APP_KLEROS_LIQUID_XDAI_ADDRESS },
      },
    },
    {
      ...KlerosLiquidExtraViews,
      networks: {
        1: { address: process.env.REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_ADDRESS },
        3: { address: process.env.REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_ROPSTEN_ADDRESS },
        42: { address: process.env.REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_KOVAN_ADDRESS },
        77: { address: process.env.REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_SOKOL_ADDRESS },
        100: { address: process.env.REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_XDAI_ADDRESS },
      },
    },
    {
      ...Pinakion,
      networks: {
        1: { address: process.env.REACT_APP_PINAKION_ADDRESS },
        3: { address: process.env.REACT_APP_PINAKION_ROPSTEN_ADDRESS },
        42: { address: process.env.REACT_APP_PINAKION_KOVAN_ADDRESS },
        77: { address: process.env.REACT_APP_PINAKION_SOKOL_ADDRESS },
        100: { address: process.env.REACT_APP_PINAKION_XDAI_ADDRESS },
      },
    },
    {
      ...PolicyRegistry,
      networks: {
        1: { address: process.env.REACT_APP_POLICY_REGISTRY_ADDRESS },
        3: { address: process.env.REACT_APP_POLICY_REGISTRY_ROPSTEN_ADDRESS },
        42: { address: process.env.REACT_APP_POLICY_REGISTRY_KOVAN_ADDRESS },
        77: { address: process.env.REACT_APP_POLICY_REGISTRY_SOKOL_ADDRESS },
        100: { address: process.env.REACT_APP_POLICY_REGISTRY_XDAI_ADDRESS },
      },
    },
    {
      ...UniswapV2Factory,
      networks: {
        1: { address: process.env.REACT_APP_UNISWAP_V2_FACTORY_ADDRESS },
        3: { address: "0x00000000219ab540356cbb839cbe05303d7705fa" },
        42: { address: process.env.REACT_APP_UNISWAP_V2_FACTORY_KOVAN_ADDRESS },
        77: { address: process.env.REACT_APP_UNISWAP_V2_FACTORY_SOKOL_ADDRESS },
        100: { address: process.env.REACT_APP_UNISWAP_V2_FACTORY_XDAI_ADDRESS },
      },
    },
    {
      ...UniswapV2Router02,
      networks: {
        1: { address: process.env.REACT_APP_UNISWAP_V2_ROUTER_02_ADDRESS },
        3: { address: "0x00000000219ab540356cbb839cbe05303d7705fa" },
        42: { address: process.env.REACT_APP_UNISWAP_V2_ROUTER_02_KOVAN_ADDRESS },
        77: { address: process.env.REACT_APP_UNISWAP_V2_ROUTER_02_SOKOL_ADDRESS },
        100: { address: process.env.REACT_APP_UNISWAP_V2_ROUTER_02_XDAI_ADDRESS },
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
  3: process.env.REACT_APP_WEB3_FALLBACK_ROPSTEN_URL,
  42: process.env.REACT_APP_WEB3_FALLBACK_KOVAN_URL,
  77: process.env.REACT_APP_WEB3_FALLBACK_SOKOL_URL,
  100: process.env.REACT_APP_WEB3_FALLBACK_XDAI_URL,
};

const { DrizzleProvider, Initializer, useDrizzle } = drizzleReactHooks;

export { DrizzleProvider, Initializer, useDrizzle };

function createDrizzle({ fallbackChainId }) {
  const fallbackUrl = chainIdToFallbackUrl[fallbackChainId];
  const optionsWeb3Mixin = fallbackUrl
    ? {
        web3: {
          fallback: {
            url: fallbackUrl,
          },
        },
      }
    : {};

  const options = { ...defaultOptions, ...optionsWeb3Mixin };

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
 * If the user e-mail client opens the link in a brower that is not
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

export default createDrizzle({ fallbackChainId: detectRequiredChainId() });
