import { Drizzle, generateStore } from "@drizzle/store";
import Kleros from "../assets/contracts/kleros.json";
import KlerosLiquid from "../assets/contracts/kleros-liquid.json";
import KlerosLiquidExtraViews from "../assets/contracts/kleros-liquid-extra-views.json";
import Pinakion from "../assets/contracts/pinakion.json";
import PolicyRegistry from "../assets/contracts/policy-registry.json";
import UniswapV2Factory from "../assets/contracts/uniswap-v2-factory.json";
import UniswapV2Router02 from "../assets/contracts/uniswap-v2-router-02.json";
import MerkleRedeem from "../../node_modules/@kleros/pnk-merkle-drop-contracts/deployments/mainnet/MerkleRedeem.json";

const options = {
  contracts: [
    {
      ...Kleros,
      networks: {
        1: { address: process.env.REACT_APP_KLEROS_ADDRESS },
        3: { address: "0x00000000219ab540356cbb839cbe05303d7705fa" },
        42: { address: process.env.REACT_APP_KLEROS_KOVAN_ADDRESS }
      }
    },
    {
      ...KlerosLiquid,
      networks: {
        1: { address: process.env.REACT_APP_KLEROS_LIQUID_ADDRESS },
        3: { address: process.env.REACT_APP_KLEROS_LIQUID_ROPSTEN_ADDRESS },
        42: { address: process.env.REACT_APP_KLEROS_LIQUID_KOVAN_ADDRESS }
      }
    },
    {
      ...KlerosLiquidExtraViews,
      networks: {
        1: { address: process.env.REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_ADDRESS },
        3: { address: process.env.REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_ROPSTEN_ADDRESS },
        42: {
          address: process.env.REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_KOVAN_ADDRESS
        }
      }
    },
    {
      ...Pinakion,
      networks: {
        1: { address: process.env.REACT_APP_PINAKION_ADDRESS },
        3: { address: process.env.REACT_APP_PINAKION_ROPSTEN_ADDRESS },
        42: { address: process.env.REACT_APP_PINAKION_KOVAN_ADDRESS }
      }
    },
    {
      ...PolicyRegistry,
      networks: {
        1: { address: process.env.REACT_APP_POLICY_REGISTRY_ADDRESS },
        3: { address: process.env.REACT_APP_POLICY_REGISTRY_ROPSTEN_ADDRESS },
        42: { address: process.env.REACT_APP_POLICY_REGISTRY_KOVAN_ADDRESS }
      }
    },
    {
      ...UniswapV2Factory,
      networks: {
        1: { address: process.env.REACT_APP_UNISWAP_V2_FACTORY_ADDRESS },
        3: { address: "0x00000000219ab540356cbb839cbe05303d7705fa" },
        42: {
          address: process.env.REACT_APP_UNISWAP_V2_FACTORY_KOVAN_ADDRESS
        }
      }
    },
    {
      ...UniswapV2Router02,
      networks: {
        1: { address: process.env.REACT_APP_UNISWAP_V2_ROUTER_02_ADDRESS },
        3: { address: "0x00000000219ab540356cbb839cbe05303d7705fa" },
        42: {
          address: process.env.REACT_APP_UNISWAP_V2_ROUTER_02_KOVAN_ADDRESS
        }
      }
    },
    {
      ...MerkleRedeem,
      networks: {
        1: { address: "0xdbc3088Dfebc3cc6A84B0271DaDe2696DB00Af38" },
        42: {
          address: "0x193353d006Ab015216D34419a845989e76612475"
        }
      }
    }
  ],
  polls: {
    accounts: 3000,
    blocks: 3000
  }
};
if (process.env.REACT_APP_WEB3_FALLBACK_URL)
  options.web3 = process.env.REACT_APP_WEB3_FALLBACK_URL && {
    fallback: {
      url: process.env.REACT_APP_WEB3_FALLBACK_URL
    }
  };
export default new Drizzle(options, generateStore(options));
