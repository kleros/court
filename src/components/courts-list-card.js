import { useDrizzle, useDrizzleState } from '../temp/drizzle-react-hooks'
import React from 'react'
import ETHAmount from './eth-amount'
import ListItem from './list-item'
import TitledListCard from './titled-list-card'
import { useDataloader } from '../bootstrap/dataloader'

const CourtsListCard = () => {
  const { useCacheCall } = useDrizzle()
  const drizzleState = useDrizzleState(drizzleState => ({
    account: drizzleState.accounts[0]
  }))
  const loadPolicy = useDataloader.loadPolicy()
  const juror = useCacheCall(
    'KlerosLiquidExtraViews',
    'getJuror',
    drizzleState.account
  )
  const names = useCacheCall(
    ['PolicyRegistry'],
    call =>
      juror &&
      juror.subcourtIDs
        .filter(ID => ID !== '0')
        .map(ID => String(ID - 1))
        .map(ID => {
          const policy = call('PolicyRegistry', 'policies', ID)
          if (policy !== undefined) {
            const policyJSON = loadPolicy(policy)
            if (policyJSON) return policyJSON.name
          }
          return undefined
        })
  )
  const stakes = useCacheCall(
    ['PolicyRegistry'],
    call =>
      juror &&
      juror.subcourtIDs
        .filter(ID => ID !== '0')
        .map(ID => String(ID - 1))
        .map(ID => {
          return useCacheCall(
            'KlerosLiquidExtraViews',
            'stakeOf',
            drizzleState.account,
            ID
          )
        })
  )

  const loading = !names || names.some(n => n === undefined)
  return (
    <TitledListCard
      loading={loading}
      prefix={names && names.length}
      title="Courts"
    >
      {!loading && names.map((n, i) => (
        <ListItem key={n}
          extra={(
            <>
              <ETHAmount amount={stakes[i]} /> PNK
            </>
          )}
        >{n}</ListItem>
      )
    )}
    </TitledListCard>
  )
}

export default CourtsListCard
