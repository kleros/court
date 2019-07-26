import { Card, Col, Row } from 'antd'
import { useDrizzle, useDrizzleState } from '../temp/drizzle-react-hooks'
import ETHAmount from './eth-amount'
import React from 'react'
import { ReactComponent as Reward } from '../assets/images/reward.svg'
import { ReactComponent as PurpleArrowBackground } from '../assets/images/purple-arrow.svg'
import { ReactComponent as LightPurpleArrowBackground } from '../assets/images/light-purple-arrow.svg'
import styled from 'styled-components/macro'

const StyledCard = styled(Card)`
  cursor: initial;
  margin: 60px 0 25px 0;
  border-radius: 12px;

  .ant-card-body {
    padding: 7px 36px;

    @media (max-width: 991px) {
      padding: 18px;
    }
  }
`
const StyledDiv = styled.div`
  font-weight: bold;
  margin: 8px 0;

  @media (max-width: 991px) {
    text-align: right;
  }
`
const StyledDivWhiteSmall = styled(StyledDiv)`
  color: white;
  font-size: 14px;
  margin: 0px;
  text-align: center;

  @media (max-width: 991px) {
    color: #4004a3;
    text-align: center;
  }
`
const StyledDivWhiteLarge = styled(StyledDiv)`
  color: white;
  font-size: 36px;
  margin: 0px;
  text-align: center;

  @media (max-width: 991px) {
    color: #4004a3;
    text-align: center;
  }
`
const StyledTopDiv = styled.div`
  font-weight: medium;

  @media (max-width: 991px) {
    margin-top: 30px;
  }
`
const StyledCenterDiv = styled.div`
  font-size: 36px;
  font-weight: bold;

  @media (max-width: 1200px) {
    font-size: 28px;
  }
`
const StyledRewardLogoCol = styled(Col)`
  min-width: 100px;
  max-width: 100px;

  @media (max-width: 991px) {
    max-width: none;
  }
`
const AmountCol = styled(Col)`
  color: #4004A3;
  margin-top: 15px;
`
const StyledPurpleArrowBackground = styled(PurpleArrowBackground)`
  height: 138px;
  position: absolute;
  left: -36px;
  top: -16px;
  z-index: 0;

  @media (max-width: 991px) {
    display: none;
  }
`
const StyledLightPurpleArrowBackground = styled(LightPurpleArrowBackground)`
  height: 138px;
  position: absolute;
  right: -36px;
  top: -16px;
  z-index: 0;

  @media (max-width: 991px) {
    display: none;
  }
`
const ETHOffset = styled.div`
  margin-left: 50%;

  @media (max-width: 991px) {
    margin-left: 0;
  }
`
const PNKOffset = styled.div`
  margin-left: 30%;

  @media (max-width: 991px) {
    margin-left: 0;
  }
`

const RewardCard = () => {
  const { drizzle, useCacheEvents } = useDrizzle()
  const drizzleState = useDrizzleState(drizzleState => ({
    account: drizzleState.accounts[0],
    balance: drizzleState.accountBalances[drizzleState.accounts[0]]
  }))
  const rewards = useCacheEvents(
    'KlerosLiquid',
    'TokenAndETHShift',
    {
      filter: { _address: drizzleState.account },
      fromBlock: process.env.REACT_APP_KLEROS_LIQUID_BLOCK_NUMBER
    },
    [drizzleState.account]
  )

  let ethRewards = drizzle.web3.utils.toBN("0")
  let pnkRewards = drizzle.web3.utils.toBN("0")
  if (rewards) {
    for (let reward of rewards) {
      ethRewards = ethRewards.add(drizzle.web3.utils.toBN(reward.returnValues._ETHAmount))
      pnkRewards = pnkRewards.add(drizzle.web3.utils.toBN(reward.returnValues._tokenAmount))
    }
  }
  return (
    <StyledCard hoverable>
      <Row>
        <StyledPurpleArrowBackground />
        <Col lg={24} style={{zIndex: "1"}}>
          <Row>
            <StyledRewardLogoCol xs={12}>
              <Reward />
            </StyledRewardLogoCol>
            <Col lg={4} xs={12}>
              <StyledDivWhiteSmall style={{marginTop: "15px"}}>
                Coherence
              </StyledDivWhiteSmall>
              <StyledDivWhiteLarge>
                Rewards
              </StyledDivWhiteLarge>
            </Col>
            <AmountCol lg={8} xs={24}>
              <ETHOffset>
                <StyledTopDiv>Total</StyledTopDiv>
                <StyledCenterDiv>
                  <ETHAmount amount={ethRewards} decimals={2} /> ETH
                </StyledCenterDiv>
              </ETHOffset>
            </AmountCol>
            <AmountCol lg={8} xs={24}>
              <PNKOffset>
                <StyledTopDiv>Total</StyledTopDiv>
                <StyledCenterDiv>
                  <ETHAmount amount={pnkRewards} decimals={0} /> PNK
                </StyledCenterDiv>
              </PNKOffset>
            </AmountCol>
          </Row>
        </Col>
        <StyledLightPurpleArrowBackground />
      </Row>
    </StyledCard>
  )
}

export default RewardCard
