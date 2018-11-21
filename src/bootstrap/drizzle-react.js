import PropTypes from 'prop-types'
import React, { createContext, useContext, useState, useEffect } from 'react'

const Context = createContext()
export const useDrizzle = () => useContext(Context)

export const DrizzleProvider = ({ children, drizzle }) => {
  const [drizzleState, setDrizzleState] = useState({
    drizzleStatus: { initialized: false },
    web3: { status: 'initializing' }
  })
  useEffect(
    () =>
      drizzle.store.subscribe(() => setDrizzleState(drizzle.store.getState())),
    [drizzle]
  )
  return (
    <Context.Provider
      value={{
        drizzle: drizzle,
        drizzleState: drizzleState
      }}
    >
      {children}
    </Context.Provider>
  )
}

DrizzleProvider.propTypes = {
  children: PropTypes.node.isRequired,
  drizzle: PropTypes.shape({}).isRequired
}
