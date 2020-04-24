import { Drizzle, generateStore } from '@drizzle/store'
import Kleros from '../assets/contracts/kleros.json'
import KlerosLiquid from '../assets/contracts/kleros-liquid.json'
import KlerosLiquidExtraViews from '../assets/contracts/kleros-liquid-extra-views.json'
import Pinakion from '../assets/contracts/pinakion.json'
import PolicyRegistry from '../assets/contracts/policy-registry.json'
import UniswapExchange from '../assets/contracts/uniswap-exchange.json'

const options = {
  contracts: [
    {
      ...Kleros,
      networks: {
        1: { address: process.env.REACT_APP_KLEROS_ADDRESS },
        42: { address: process.env.REACT_APP_KLEROS_KOVAN_ADDRESS }
      }
    },
    {
      ...KlerosLiquid,
      networks: {
        1: { address: process.env.REACT_APP_KLEROS_LIQUID_ADDRESS },
        42: { address: process.env.REACT_APP_KLEROS_LIQUID_KOVAN_ADDRESS }
      }
    },
    {
      ...KlerosLiquidExtraViews,
      networks: {
        1: { address: process.env.REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_ADDRESS },
        42: {
          address: process.env.REACT_APP_KLEROS_LIQUID_EXTRA_VIEWS_KOVAN_ADDRESS
        }
      }
    },
    {
      ...Pinakion,
      networks: {
        1: { address: process.env.REACT_APP_PINAKION_ADDRESS },
        42: { address: process.env.REACT_APP_PINAKION_KOVAN_ADDRESS }
      }
    },
    {
      ...PolicyRegistry,
      networks: {
        1: { address: process.env.REACT_APP_POLICY_REGISTRY_ADDRESS },
        42: { address: process.env.REACT_APP_POLICY_REGISTRY_KOVAN_ADDRESS }
      }
    },
    {
      ...UniswapExchange,
      networks: {
        1: { address: process.env.REACT_APP_UNISWAP_EXCHANGE_ADDRESS },
        42: { address: process.env.REACT_APP_UNISWAP_EXCHANGE_KOVAN_ADDRESS }
      }
    }
  ],
  polls: {
    accounts: 3000,
    blocks: 3000
  }
}
if (process.env.REACT_APP_WEB3_FALLBACK_URL) options.web3 = process.env.REACT_APP_WEB3_FALLBACK_URL && {
  fallback: {
    url: process.env.REACT_APP_WEB3_FALLBACK_URL
  }
}
export default new Drizzle(options, generateStore(options))
