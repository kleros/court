import { drizzleReactHooks } from '@drizzle/react-plugin'
import React from 'react'
import ETHAmount from './eth-amount'
import ListItem from './list-item'

const { useDrizzle, useDrizzleState } = drizzleReactHooks

const CourtListItem = ({ ID, name }) => {
  const { useCacheCall } = useDrizzle()
  const drizzleState = useDrizzleState(drizzleState => ({
    account: drizzleState.accounts[0]
  }))

  const stake = useCacheCall(
    'KlerosLiquidExtraViews',
    'stakeOf',
    drizzleState.account,
    ID
  )

  return (
    <ListItem
      extra={
        <>
          <ETHAmount amount={stake} /> PNK
        </>
      }
    >
      {name}
    </ListItem>
  )
}

export default CourtListItem
