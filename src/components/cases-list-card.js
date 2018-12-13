import React, { useMemo } from 'react'
import { List } from 'antd'
import TitledListCard from './titled-list-card'
import styled from 'styled-components/macro'
import { useDrizzle } from '../temp/drizzle-react-hooks'

const StyledListItem = styled(List.Item)`
  font-weight: bold;
  padding-left: 19px;
`
const CasesListCard = () => {
  const { cacheCall, drizzleState, useCacheEvents } = useDrizzle()
  const draws = useCacheEvents(
    'KlerosLiquid',
    'Draw',
    useMemo(
      () => ({
        filter: { _address: drizzleState.accounts[0] },
        fromBlock: 0
      }),
      [drizzleState.accounts[0]]
    )
  )
  const disputes = draws
    ? draws.reduce(
        (acc, d) => {
          if (!acc.IDs[d.returnValues._disputeID]) {
            acc.IDs[d.returnValues._disputeID] = true
            acc.total++
            const dispute = cacheCall(
              'KlerosLiquid',
              'disputes',
              d.returnValues._disputeID
            )
            if (dispute) acc[dispute.period === 4 ? 'executed' : 'active']++
            else acc.loading = true
          }
          return acc
        },
        { IDs: {}, active: 0, executed: 0, loading: false, total: 0 }
      )
    : { loading: true }
  return (
    <TitledListCard
      loading={disputes.loading}
      prefix={disputes.total}
      title="Cases"
    >
      <StyledListItem extra={disputes.active}>Active</StyledListItem>
      <StyledListItem extra={disputes.executed}>Executed</StyledListItem>
    </TitledListCard>
  )
}

export default CasesListCard
