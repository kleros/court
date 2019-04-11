import { useDrizzle, useDrizzleState } from '../temp/drizzle-react-hooks'
import { List } from 'antd'
import React from 'react'
import TitledListCard from './titled-list-card'
import styled from 'styled-components/macro'
import { useDataloader } from '../bootstrap/dataloader'

const StyledListItem = styled(List.Item)`
  font-weight: bold;
  padding-left: 19px;
`
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
  const loading = !names || names.some(n => n === undefined)
  return (
    <TitledListCard
      loading={loading}
      prefix={names && names.length}
      title="Courts"
    >
      {!loading && names.map(n => <StyledListItem key={n}>{n}</StyledListItem>)}
    </TitledListCard>
  )
}

export default CourtsListCard
