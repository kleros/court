import React, { useMemo } from 'react'
import { useDrizzle, useDrizzleState } from '../temp/drizzle-react-hooks'
import ETHAmount from './eth-amount'
import PieChart from './pie-chart'
import { Spin } from 'antd'
import TitledListCard from './titled-list-card'
import styled from 'styled-components/macro'
import { useDataloader } from '../bootstrap/dataloader'

const loadingPieChartData = [{ tooltip: 'Loading...', value: 1 }]
const emptyPieChartData = [{ tooltip: '0 PNK', value: 1 }]
const StyledDiv = styled.div`
  display: flex;
`
const StyledAmountSpan = styled.span`
  font-weight: bold;
`
const StyledTitleSpan = styled.span`
  font-style: italic;
`
const PNKStatsListCard = () => {
  const { drizzle, useCacheCall, useCacheEvents } = useDrizzle()
  const drizzleState = useDrizzleState(drizzleState => ({
    account: drizzleState.accounts[0]
  }))
  const load = useDataloader.load()
  const subcourtIDs = useCacheCall(
    'KlerosLiquid',
    'getJuror',
    drizzleState.account
  )
  const subcourts = useCacheCall(
    ['KlerosLiquid', 'PolicyRegistry'],
    call =>
      subcourtIDs &&
      subcourtIDs.map(ID => {
        const subcourt = { name: undefined, stake: undefined }
        subcourt.stake = call(
          'KlerosLiquid',
          'stakeOf',
          drizzleState.account,
          ID
        )
        const policy = call('PolicyRegistry', 'policies', ID)
        if (policy !== undefined) {
          const policyJSON = load(policy)
          if (policyJSON) subcourt.name = policyJSON.name
        }
        return subcourt
      })
  )
  const loadingSubcourts = !subcourts || subcourts.some(s => !s.stake)
  const draws = useCacheEvents(
    'KlerosLiquid',
    'Draw',
    useMemo(
      () => ({
        filter: { _address: drizzleState.account },
        fromBlock: 0
      }),
      [drizzleState.account]
    )
  )
  const disputes = useCacheCall(['KlerosLiquid'], call =>
    draws
      ? draws.reduce(
          (acc, d) => {
            if (acc.jurorAtStakeByID[d.returnValues._disputeID] === undefined) {
              acc.jurorAtStakeByID[d.returnValues._disputeID] = null
              const dispute = call(
                'KlerosLiquid',
                'disputes',
                d.returnValues._disputeID
              )
              const dispute2 = call(
                'KlerosLiquid',
                'getDispute',
                d.returnValues._disputeID
              )
              if (dispute && dispute2) {
                if (!dispute.period !== '4') {
                  acc.jurorAtStakeByID[
                    d.returnValues._disputeID
                  ] = dispute2.jurorAtStake.map(drizzle.web3.utils.toBN)
                  acc.atStakeByID[
                    d.returnValues._disputeID
                  ] = drizzle.web3.utils.toBN(0)
                }
              } else acc.loading = true
            }
            if (acc.jurorAtStakeByID[d.returnValues._disputeID] !== null)
              acc.atStakeByID[d.returnValues._disputeID] = acc.atStakeByID[
                d.returnValues._disputeID
              ].add(
                acc.jurorAtStakeByID[d.returnValues._disputeID][
                  d.returnValues._appeal
                ]
              )
            return acc
          },
          {
            atStakeByID: {},
            jurorAtStakeByID: {},
            loading: false
          }
        )
      : { loading: true }
  )
  const disputesAtStakeByIDKeys =
    !disputes.loading && Object.keys(disputes.atStakeByID)
  return (
    <TitledListCard prefix="PNK" title="Stats">
      <StyledDiv>
        <Spin spinning={loadingSubcourts}>
          <PieChart
            data={
              loadingSubcourts
                ? loadingPieChartData
                : subcourts.length === 0
                ? emptyPieChartData
                : subcourts.map(s => ({
                    tooltip: (
                      <Spin spinning={s.name === undefined}>
                        <StyledAmountSpan>
                          <ETHAmount amount={s.stake} /> PNK
                        </StyledAmountSpan>
                        <StyledTitleSpan> - {s.name || '...'}</StyledTitleSpan>
                      </Spin>
                    ),
                    value: Number(s.stake)
                  }))
            }
            title="Staked Tokens"
          />
        </Spin>
        <Spin spinning={disputes.loading}>
          <PieChart
            data={
              disputes.loading
                ? loadingPieChartData
                : disputesAtStakeByIDKeys.length === 0
                ? emptyPieChartData
                : disputesAtStakeByIDKeys.map(ID => ({
                    tooltip: (
                      <>
                        <StyledAmountSpan>
                          <ETHAmount amount={disputes.atStakeByID[ID]} /> PNK
                        </StyledAmountSpan>
                        <StyledTitleSpan> - Case {ID}</StyledTitleSpan>
                      </>
                    ),
                    value: Number(disputes.atStakeByID[ID])
                  }))
            }
            title="Locked Tokens"
          />
        </Spin>
      </StyledDiv>
    </TitledListCard>
  )
}

export default PNKStatsListCard
