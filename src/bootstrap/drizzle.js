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
        1: { address: process.env.REACT_APP_KLEROS_LIQUID_ADDRESS },
        42: { address: process.env.REACT_APP_KLEROS_LIQUID_KOVAN_ADDRESS }
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
export default new Drizzle(options, generateStore(options))
