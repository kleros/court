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
  const load = useDataloader.load()
  const subcourtIDs = useCacheCall(
    'KlerosLiquid',
    'getJuror',
    drizzleState.account
  )
  const names = useCacheCall(
    ['PolicyRegistry'],
    call =>
      subcourtIDs &&
      subcourtIDs.map(ID => {
        const policy = call('PolicyRegistry', 'policies', ID)
        if (policy) {
          const policyJSON = load(policy.fileURI)
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
