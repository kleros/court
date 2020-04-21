import Archon from '@kleros/archon'
import PropTypes from 'prop-types'
import { drizzleReactHooks } from '@drizzle/react-plugin'
import { useEffect } from 'react'

const { useDrizzle } = drizzleReactHooks

const archon = new Archon(undefined, 'https://ipfs.kleros.io')
export default archon

export const ArchonInitializer = ({ children }) => {
  const { drizzle } = useDrizzle()
  useEffect(() => archon.setProvider(drizzle.web3.currentProvider), [
    drizzle.web3.currentProvider
  ])
  return children
}

ArchonInitializer.propTypes = {
  children: PropTypes.node.isRequired
}
