import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'
import PropTypes from 'prop-types'

const Context = createContext()
export const useDrizzle = () => useContext(Context)

export const DrizzleProvider = ({ children, drizzle }) => {
  const [drizzleState, setDrizzleState] = useState({
    accounts: {},
    drizzleStatus: { initialized: false },
    web3: { status: 'initializing' }
  })
  const setAndCacheDrizzleState = useCallback(newDrizzleState => {
    setDrizzleState(newDrizzleState)
    localStorage.setItem(
      newDrizzleState.accounts[0],
      JSON.stringify(newDrizzleState)
    )
  })
  useEffect(
    () => {
      const cachedDrizzleState = JSON.parse(
        localStorage.getItem(drizzleState.accounts[0])
      )
      if (cachedDrizzleState) setDrizzleState(cachedDrizzleState)
    },
    [drizzleState.accounts[0]]
  )
  useEffect(
    () =>
      drizzle.store.subscribe(() =>
        setAndCacheDrizzleState(drizzle.store.getState())
      ),
    [drizzle]
  )
  return (
    <Context.Provider
      value={useMemo(
        () => ({
          drizzle,
          drizzleState,
          setDrizzleState: setAndCacheDrizzleState
        }),
        [drizzle, drizzleState, setAndCacheDrizzleState]
      )}
    >
      {children}
    </Context.Provider>
  )
}

DrizzleProvider.propTypes = {
  children: PropTypes.node.isRequired,
  drizzle: PropTypes.shape({}).isRequired
}

export const Initializer = ({ children }) => {
  const { drizzleState } = useDrizzle()
  if (drizzleState.drizzleStatus.initialized) return children
  if (drizzleState.web3.status === 'initialized')
    return 'Loading contracts and accounts.'
  if (drizzleState.web3.status === 'failed') return 'Error.'
  return 'Loading web3.'
}

Initializer.propTypes = {
  children: PropTypes.node.isRequired
}
