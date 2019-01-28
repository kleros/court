import { Drizzle, generateStore } from 'drizzle'
import KlerosLiquid from '../assets/contracts/kleros-liquid.json'
import Pinakion from '../assets/contracts/pinakion.json'
import PolicyRegistry from '../assets/contracts/policy-registry.json'
import UniswapExchange from '../assets/contracts/uniswap-exchange.json'

const options = {
  contracts: [
    {
      ...KlerosLiquid,
      networks: {
        42: { address: process.env.REACT_APP_KLEROS_LIQUID_KOVAN_ADDRESS }
      }
    },
    {
      ...Pinakion,
      networks: {
        42: { address: process.env.REACT_APP_PINAKION_KOVAN_ADDRESS }
      }
    },
    {
      ...PolicyRegistry,
      networks: {
        42: { address: process.env.REACT_APP_POLICY_REGISTRY_KOVAN_ADDRESS }
      }
    },
    {
      ...UniswapExchange,
      networks: {
        42: { address: process.env.REACT_APP_UNISWAP_EXCHANGE_KOVAN_ADDRESS }
      }
    }
  ],
  polls: {
    accounts: 3000,
    blocks: 3000
  },
  web3: {
    fallback: {
      type: 'ws',
      url: process.env.REACT_APP_WEB3_FALLBACK_URL
    }
  }
}
export default new Drizzle(options, generateStore(options))
