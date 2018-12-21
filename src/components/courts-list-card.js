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
  const { cacheCall } = useDrizzle()
  const drizzleState = useDrizzleState(drizzleState => ({
    accounts: drizzleState.accounts
  }))
  const load = useDataloader()
  const subcourtIDs = cacheCall(
    'KlerosLiquid',
    'getJuror',
    drizzleState.accounts[0]
  )
  const names =
    subcourtIDs &&
    subcourtIDs.map(ID => {
      const policy = cacheCall('PolicyRegistry', 'policies', ID)
      if (policy) {
        const policyJSON = load(policy.fileURI)
        if (policyJSON) return policyJSON.name
      }
      return undefined
    })
  const loading = !names || names.some(n => !n)
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
