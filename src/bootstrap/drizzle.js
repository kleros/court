import { Drizzle, generateStore } from "@drizzle/store";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import Kleros from "../assets/contracts/kleros.json";
import KlerosLiquid from "../assets/contracts/kleros-liquid.json";
import KlerosLiquidExtraViews from "../assets/contracts/kleros-liquid-extra-views.json";
import Pinakion from "../assets/contracts/pinakion.json";
import PolicyRegistry from "../assets/contracts/policy-registry.json";
import UniswapV2Factory from "../assets/contracts/uniswap-v2-factory.json";
import UniswapV2Router02 from "../assets/contracts/uniswap-v2-router-02.json";
import { MAINNET, GOERLI, GNOSIS, CHIADO, SEPOLIA, getFallbackUrl } from "../helpers/networks";
import {
  oldKlerosAddresses,
  klerosLiquidAddresses,
  klerosLiquidExtraViewsAddresses,
  pinakionAddresses,
  policyRegistryAddresses,
  uniswapV2FactoryAddresses,
  uniswapV2Router02Addresses,
} from "../helpers/deployments";

const defaultOptions = {
  networkWhitelist: [MAINNET, GOERLI, GNOSIS, CHIADO, SEPOLIA],
  contracts: [
    {
      ...Kleros,
      networks: oldKlerosAddresses,
    },
    {
      ...KlerosLiquid,
      networks: klerosLiquidAddresses,
    },
    {
      ...KlerosLiquidExtraViews,
      networks: klerosLiquidExtraViewsAddresses,
    },
    {
      ...Pinakion,
      networks: pinakionAddresses,
    },
    {
      ...PolicyRegistry,
      networks: policyRegistryAddresses,
    },
    {
      ...UniswapV2Factory,
      networks: uniswapV2FactoryAddresses,
    },
    {
      ...UniswapV2Router02,
      networks: uniswapV2Router02Addresses,
    },
  ],
  polls: {
    accounts: 3000,
    blocks: 3000,
  },
};

const { DrizzleProvider, Initializer, useDrizzle } = drizzleReactHooks;

export { DrizzleProvider, Initializer, useDrizzle };

function createDrizzle({ fallbackChainId }) {
  const fallbackUrl = getFallbackUrl(fallbackChainId);
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
const DEFAULT_FALLBACK_CHAIN_ID = MAINNET;

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
