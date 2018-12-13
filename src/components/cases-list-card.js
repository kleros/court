import React, { useMemo } from 'react'
import { List } from 'antd'
import TitledListCard from './titled-list-card'
import styled from 'styled-components/macro'
import { useDrizzle } from '../temp/drizzle-react-hooks'

// TODO
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
  const counts =
    draws &&
    Object.entries(
      draws.reduce((acc, d) => {
        if (acc[d.returnValues._disputeID]) acc[d.returnValues._disputeID]++
        else acc[d.returnValues._disputeID] = 1
        return acc
      }, {})
    ).reduce(
      (acc, d) => {
        const dispute = cacheCall('KlerosLiquid', 'disputes', d[0])
        if (dispute) acc[dispute.period === 4 ? 1 : 0]++
        return acc
      },
      [0, 0]
    )
  return (
    <TitledListCard prefix={draws && draws.length} title="Cases">
      <StyledListItem extra={draws && counts[0]}>Active</StyledListItem>
      <StyledListItem extra={draws && counts[1]}>Executed</StyledListItem>
    </TitledListCard>
  )
}

export default CasesListCard
