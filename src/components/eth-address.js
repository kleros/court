import PropTypes from 'prop-types'
import React from 'react'

const ETHAddress = ({ address }) => (
  <a
    href={`https://etherscan.io/address/${address}`}
    rel="noopener noreferrer"
    target="_blank"
  >
    {address.slice(0, 6)}...{address.slice(address.length - 4)}
  </a>
)

ETHAddress.propTypes = {
  address: PropTypes.string.isRequired
}

export default ETHAddress
