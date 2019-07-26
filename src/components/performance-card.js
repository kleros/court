import React from 'react'
import { useDrizzle, useDrizzleState } from '../temp/drizzle-react-hooks'
import PercentageCircle from './percentage-circle'
import { Spin } from 'antd'
import TitledListCard from './titled-list-card'
import styled from 'styled-components/macro'

const StyledDiv = styled.div`
  align-items: center;
  display: flex;
  justify-content: center;
  padding: 30px;

  & > div {
    flex: 1;
  }
`
const StyledText = styled.div`
  color: #4004A3;
  font-size: 18px;
  margin-top: 15px;
  text-align: center;
`
const StyledGraphContainer = styled.div`
  margin-bottom: 15px;
  margin: auto;
  width: 40%;

`

const PNKStatsListCard = () => {
  const { useCacheEvents } = useDrizzle()
  const drizzleState = useDrizzleState(drizzleState => ({
    account: drizzleState.accounts[0]
  }))

  let loadingData = true
  const rewards = useCacheEvents(
    'KlerosLiquid',
    'TokenAndETHShift',
    {
      filter: { _address: drizzleState.account },
      fromBlock: process.env.REACT_APP_KLEROS_LIQUID_BLOCK_NUMBER
    },
    [drizzleState.account]
  )

  if (rewards && rewards.length) loadingData = false

  let totalCases = 0
  let coherentVote = 0
  let lastSeenDispute = -1
  if (!loadingData) {
    for (let reward of rewards) {
      if (Number(reward.returnValues._disputeID) !== lastSeenDispute) {
        totalCases++
        lastSeenDispute = Number(reward.returnValues._disputeID)
        if (Number(reward.returnValues._ETHAmount) > 0) coherentVote++
      }

    }
  }

  const percent = loadingData ? 0 : (coherentVote / totalCases).toFixed(2) * 100

  return (
    <TitledListCard prefix="%" title="Voting Performance">
      <StyledDiv>
        <Spin spinning={loadingData}>
          <StyledGraphContainer>
            <PercentageCircle
              percent={percent}
            />
          </StyledGraphContainer>
          <StyledText>Cases Coherent</StyledText>
        </Spin>
      </StyledDiv>
    </TitledListCard>
  )
}

export default PNKStatsListCard
