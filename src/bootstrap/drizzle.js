import { Drizzle, generateStore } from 'drizzle'

import KlerosLiquid from '../assets/contracts/kleros-liquid.json'
import Pinakion from '../assets/contracts/pinakion.json'

const options = {
  contracts: [
    {
      ...KlerosLiquid,
      networks: { 42: { address: process.env.KLEROS_LIQUID_KOVAN_ADDRESS } }
    },
    {
      ...Pinakion,
      networks: { 42: { address: process.env.PINAKION_KOVAN_ADDRESS } }
    }
  ]
}
export default new Drizzle(options, generateStore(options))
