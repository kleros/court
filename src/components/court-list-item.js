import { drizzleReactHooks } from '@drizzle/react-plugin'
import React from 'react'
import ETHAmount from './eth-amount'
import ListItem from './list-item'
import { VIEW_ONLY_ADDRESS } from '../bootstrap/dataloader'

const { useDrizzle, useDrizzleState } = drizzleReactHooks

const CourtListItem = ({ ID, name }) => {
  const { useCacheCall } = useDrizzle()
  const drizzleState = useDrizzleState(drizzleState => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS
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
