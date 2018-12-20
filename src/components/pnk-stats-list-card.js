import React, { useMemo } from 'react'
import ETHAmount from './eth-amount'
import PieChart from './pie-chart'
import { Spin } from 'antd'
import TitledListCard from './titled-list-card'
import styled from 'styled-components/macro'
import { useDataloader } from '../bootstrap/dataloader'
import { useDrizzle } from '../temp/drizzle-react-hooks'

const StyledAmountSpan = styled.span`
  font-weight: bold;
`
const StyledTitleSpan = styled.span`
  font-style: italic;
`
const PNKStatsListCard = () => {
  const { cacheCall, drizzleState } = useDrizzle()
  const load = useDataloader()
  const subcourtIDs = cacheCall(
    'KlerosLiquid',
    'getJuror',
    drizzleState.accounts[0]
  )
  const subcourts =
    subcourtIDs &&
    subcourtIDs.map(ID => {
      const subcourt = {}
      subcourt.stake = cacheCall(
        'KlerosLiquid',
        'stakeOf',
        drizzleState.accounts[0],
        ID
      )
      const policy = cacheCall('PolicyRegistry', 'policies', ID)
      if (policy) {
        const policyJSON = load(policy.fileURI)
        if (policyJSON) subcourt.name = policyJSON.name
      }
      return subcourt
    })
  const loading = !subcourts || subcourts.some(s => s.stake === undefined)
  return (
    <TitledListCard loading={loading} prefix="PNK" title="Stats">
      {!loading && (
        <PieChart
          data={useMemo(
            () =>
              subcourts.map(s => ({
                tooltip: (
                  <Spin spinning={s.name === undefined}>
                    <StyledAmountSpan>
                      <ETHAmount amount={s.stake} /> PNK
                    </StyledAmountSpan>
                    <StyledTitleSpan> - {s.name || '...'}</StyledTitleSpan>
                  </Spin>
                ),
                value: Number(s.stake)
              })),
            [...subcourts.map(s => s.stake), ...subcourts.map(s => s.name)]
          )}
        />
      )}
    </TitledListCard>
  )
}

export default PNKStatsListCard
