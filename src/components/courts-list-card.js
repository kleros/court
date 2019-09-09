import { useDrizzle, useDrizzleState } from '../temp/drizzle-react-hooks'
import React from 'react'
import ListItem from './list-item'
import TitledListCard from './titled-list-card'
import CourtListItem from './court-list-item'
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
            if (policyJSON)
              return {
                name: policyJSON.name,
                ID
              }
          }
          return undefined
        })
  )

  const loading = !names || names.some(n => n === undefined)
  return (
    <TitledListCard
      loading={loading}
      prefix={names && names.length}
      title="Courts"
    >
      {!loading &&
        (names.length > 0 ? (
          names.map((n, i) => (
            <CourtListItem ID={Number(n.ID)} key={n.name} name={n.name} />
          ))
        ) : (
          <>
            <ListItem key="Court-List-None">
              You are not staked in any courts.
            </ListItem>
          </>
        ))}
    </TitledListCard>
  )
}

export default CourtsListCard
