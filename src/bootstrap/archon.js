import Archon from '@brainsale/archon'
import PropTypes from 'prop-types'
import { drizzleReactHooks } from '@drizzle/react-plugin'
import { useEffect } from 'react'

const { useDrizzle } = drizzleReactHooks

const archon = new Archon(undefined, 'https://ipfs.fleek.co')
export default archon

export const ArchonInitializer = ({ children }) => {
  const { drizzle } = useDrizzle()
  useEffect(() => {
    drizzle.web3 && archon.setProvider(drizzle.web3.currentProvider)
  }, [
    drizzle.web3
  ])
  return children
}

ArchonInitializer.propTypes = {
  children: PropTypes.node.isRequired
}
