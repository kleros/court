import React, { useMemo } from 'react'
import { useDrizzle, useDrizzleState } from '../temp/drizzle-react-hooks'
import ETHAmount from './eth-amount'
import PieChart from './pie-chart'
import { Spin } from 'antd'
import TitledListCard from './titled-list-card'
import styled from 'styled-components/macro'
import { useDataloader } from '../bootstrap/dataloader'

const loadingPieChartData = [{ tooltip: 'Loading...', value: 1 }]
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
  const { cacheCall, drizzle, useCacheEvents } = useDrizzle()
  const drizzleState = useDrizzleState(drizzleState => ({
    accounts: drizzleState.accounts
  }))
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
  const loadingSubcourts =
    !subcourts || subcourts.some(s => s.stake === undefined)
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
          if (acc.atStakePerVoteByID[d.returnValues._disputeID] === undefined) {
            acc.atStakePerVoteByID[d.returnValues._disputeID] = null
            const dispute = cacheCall(
              'KlerosLiquid',
              'disputes',
              d.returnValues._disputeID
            )
            const dispute2 = cacheCall(
              'KlerosLiquid',
              'getDispute',
              d.returnValues._disputeID
            )
            if (dispute && dispute2) {
              if (!dispute.period !== '4') {
                acc.atStakePerVoteByID[
                  d.returnValues._disputeID
                ] = drizzle.web3.utils.toBN(
                  dispute2.jurorAtStake[dispute2.jurorAtStake.length - 1]
                )
                acc.atStakeByID[
                  d.returnValues._disputeID
                ] = drizzle.web3.utils.toBN(0)
              }
            } else acc.loading = true
          }
          if (acc.atStakePerVoteByID[d.returnValues._disputeID] !== null)
            acc.atStakeByID[d.returnValues._disputeID] = acc.atStakeByID[
              d.returnValues._disputeID
            ].add(acc.atStakePerVoteByID[d.returnValues._disputeID])
          return acc
        },
        {
          atStakeByID: {},
          atStakePerVoteByID: {},
          loading: false
        }
      )
    : { loading: true }
  return (
    <TitledListCard prefix="PNK" title="Stats">
      <StyledDiv>
        <Spin spinning={loadingSubcourts}>
          <PieChart
            data={
              loadingSubcourts
                ? loadingPieChartData
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
                : Object.entries(disputes.atStakeByID).map(s => ({
                    tooltip: (
                      <>
                        <StyledAmountSpan>
                          <ETHAmount amount={s[1]} /> PNK
                        </StyledAmountSpan>
                        <StyledTitleSpan> - Case {s[0]}</StyledTitleSpan>
                      </>
                    ),
                    value: Number(s[1])
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
