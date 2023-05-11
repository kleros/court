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
    5, // Görli
    100, // xDAI
    10200, // Chiado
  ],
  contracts: [
    {
      ...Kleros,
      networks: {
        1: { address: process.env.REACT_APP_KLEROS_ADDRESS },
        5: { address: "0x00000000219ab540356cbb839cbe05303d7705fa" }, // Dummy address for coping with Drizzle errors.
        100: { address: process.env.REACT_APP_KLEROS_XDAI_ADDRESS },
        10200: { address: "0x00000000219ab540356cbb839cbe05303d7705fa" }, // Dummy address for coping with Drizzle errors.
      },
    },
    {
      ...KlerosLiquid,
      networks: {
        1: { address: process.env.REACT_APP_KLEROS_LIQUID_ADDRESS },
        5: { address: process.env.REACT_APP_KLEROS_LIQUID_GOERLI_ADDRESS },
        100: { address: process.env.REACT_APP_KLEROS_LIQUID_XDAI_ADDRESS },
        10200: { address: process.env.REACT_APP_KLEROS_LIQUID_CHIADO_ADDRESS },
      },
    },
    {
      ...KlerosLiquidExtraViews,
      networks: {
        1: { address: process.env.REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_ADDRESS },
        5: { address: process.env.REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_GOERLI_ADDRESS },
        100: { address: process.env.REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_XDAI_ADDRESS },
        10200: { address: process.env.REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_CHIADO_ADDRESS },
      },
    },
    {
      ...Pinakion,
      networks: {
        1: { address: process.env.REACT_APP_PINAKION_ADDRESS },
        5: { address: process.env.REACT_APP_PINAKION_GOERLI_ADDRESS },
        100: { address: process.env.REACT_APP_PINAKION_XDAI_ADDRESS },
        10200: { address: process.env.REACT_APP_PINAKION_CHIADO_ADDRESS },
      },
    },
    {
      ...PolicyRegistry,
      networks: {
        1: { address: process.env.REACT_APP_POLICY_REGISTRY_ADDRESS },
        5: { address: process.env.REACT_APP_POLICY_REGISTRY_GOERLI_ADDRESS },
        100: { address: process.env.REACT_APP_POLICY_REGISTRY_XDAI_ADDRESS },
        10200: { address: process.env.REACT_APP_POLICY_REGISTRY_CHIADO_ADDRESS },
      },
    },
    {
      ...UniswapV2Factory,
      networks: {
        1: { address: process.env.REACT_APP_UNISWAP_V2_FACTORY_ADDRESS },
        5: { address: "0x00000000219ab540356cbb839cbe05303d7705fa" }, // Dummy address for coping with Drizzle errors.
        100: { address: process.env.REACT_APP_UNISWAP_V2_FACTORY_XDAI_ADDRESS },
        10200: { address: "0x00000000219ab540356cbb839cbe05303d7705fa" }, // Dummy address for coping with Drizzle errors.
      },
    },
    {
      ...UniswapV2Router02,
      networks: {
        1: { address: process.env.REACT_APP_UNISWAP_V2_ROUTER_02_ADDRESS },
        5: { address: "0x00000000219ab540356cbb839cbe05303d7705fa" }, // Dummy address for coping with Drizzle errors.
        100: { address: process.env.REACT_APP_UNISWAP_V2_ROUTER_02_XDAI_ADDRESS },
        10200: { address: "0x00000000219ab540356cbb839cbe05303d7705fa" }, // Dummy address for coping with Drizzle errors.
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
  5: process.env.REACT_APP_WEB3_FALLBACK_GOERLI_URL,
  100: process.env.REACT_APP_WEB3_FALLBACK_XDAI_URL,
  10200: process.env.REACT_APP_WEB3_FALLBACK_CHIADO_URL,
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
const DEFAULT_FALLBACK_CHAIN_ID = 1;

export default createDrizzle({ fallbackChainId: DEFAULT_FALLBACK_CHAIN_ID });
