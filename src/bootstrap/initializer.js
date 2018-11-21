import PropTypes from 'prop-types'

import { useDrizzle } from './drizzle-react'

const Initializer = ({ children }) => {
  const { drizzleState } = useDrizzle()
  if (drizzleState.drizzleStatus.initialized) return children
  if (drizzleState.web3.status === 'initialized') return 'No accounts.'
  if (drizzleState.web3.status === 'failed') return 'Error.'
  return 'Loading.'
}

Initializer.propTypes = {
  children: PropTypes.node.isRequired
}

export default Initializer
