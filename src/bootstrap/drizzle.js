import { Drizzle, generateStore } from "@drizzle/store";
import Kleros from "../assets/contracts/kleros.json";
import KlerosLiquid from "../assets/contracts/kleros-liquid.json";
import KlerosLiquidExtraViews from "../assets/contracts/kleros-liquid-extra-views.json";
import Pinakion from "../assets/contracts/pinakion.json";
import PolicyRegistry from "../assets/contracts/policy-registry.json";
import UniswapV2Factory from "../assets/contracts/uniswap-v2-factory.json";
import UniswapV2Router02 from "../assets/contracts/uniswap-v2-router-02.json";

const options = {
  networkWhitelist: [
    1, // Mainnet
    3, // Ropsten
    42, // Kovan
    77, // Sokol
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

if (process.env.REACT_APP_WEB3_FALLBACK_URL) {
  options.web3 = process.env.REACT_APP_WEB3_FALLBACK_URL && {
    fallback: {
      url: process.env.REACT_APP_WEB3_FALLBACK_URL,
    },
  };
}

export default new Drizzle(options, generateStore(options));
