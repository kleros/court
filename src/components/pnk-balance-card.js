import { Card, Col, Row } from 'antd'
import React from 'react'

import { ReactComponent as Reward } from '../assets/images/reward.svg'
import { ReactComponent as PurpleArrowBackground } from '../assets/images/purple-arrow.svg'
import { ReactComponent as LightPurpleArrowBackground } from '../assets/images/light-purple-arrow.svg'
import { useDrizzle, useDrizzleState } from '../temp/drizzle-react-hooks'

import ETHAddress from './eth-address'
import ETHAmount from './eth-amount'
import Hint from './hint'

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
  color: #4004A3;
  margin-top: 8px;

  @media (max-width: 991px) {
  }
`
const StyledDivWhiteSmall = styled(StyledDiv)`
  color: white;
  font-size: 14px;
  margin-top: 8px;

  @media (max-width: 991px) {
    color: #4004a3;
  }
`
const StyledDivWhiteLarge = styled(StyledDiv)`
  color: white;
  font-size: 36px;
  margin: 0px;

  @media (max-width: 1200px) {
    font-size: 28px;
  }

  @media (max-width: 991px) {
    color: #4004a3;
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
  color: #4004A3;

  @media (max-width: 1200px) {
    font-size: 28px;
  }
`
const StyledBottomDiv = styled.div`
  font-size: 14px;
  font-weight: bold;
  color: #4004A3;
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

  @media (max-width: 1200px) {
    height: 115%;
    left: -60px;
    top: -7px;
  }

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

  @media (max-width: 1200px) {
    height: 115%;
    right: -60px;
    top: -7px;
  }

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
const PNKCol = styled(Col)`
  padding-left: 58px;
`

const PNKBalanceCard = () => {
  const { useCacheCall } = useDrizzle()
  const drizzleState = useDrizzleState(drizzleState => ({
    account: drizzleState.accounts[0],
    balance: drizzleState.accountBalances[drizzleState.accounts[0]]
  }))
  const juror = useCacheCall(
    'KlerosLiquidExtraViews',
    'getJuror',
    drizzleState.account
  )
  return (
    <StyledCard hoverable>
      <Row>
        <StyledPurpleArrowBackground />
        <Col lg={24} style={{zIndex: "1"}}>
          <Row>
            <PNKCol lg={8} xs={24}>
              <StyledDivWhiteSmall>
                Your wallet balance
              </StyledDivWhiteSmall>
              <StyledDivWhiteLarge>
                <ETHAmount
                  amount={useCacheCall(
                    'MiniMeTokenERC20',
                    'balanceOf',
                    drizzleState.account
                  )}
                />{' '}
                PNK
              </StyledDivWhiteLarge>
              <StyledBottomDiv style={{color: "white"}}>
                <ETHAmount amount={drizzleState.balance} decimals={4} /> ETH
              </StyledBottomDiv>
            </PNKCol>
            <PNKCol lg={8} xs={24}>
              <StyledDiv>
                You Have
              </StyledDiv>
              <StyledCenterDiv>
                <ETHAmount amount={juror && juror.stakedTokens} /> PNK
              </StyledCenterDiv>
              <StyledBottomDiv>
                Staked{' '}
                <Hint
                  description="The more you stake, the higher your chances of being drawn as a juror."
                  title={
                    <>
                      <ETHAmount
                        amount={juror && juror.stakedTokens}
                      />{' '}
                      PNK
                    </>
                  }
                />
              </StyledBottomDiv>
            </PNKCol>
            <PNKCol lg={8} xs={12}>
              <StyledDiv>
                You Have
              </StyledDiv>
              <StyledCenterDiv>
                <ETHAmount amount={juror && juror.lockedTokens} /> PNK
              </StyledCenterDiv>
              <StyledBottomDiv>
                Locked{' '}
                <Hint
                  description="These PNK are locked in active disputes for potential redistribution."
                  title={
                    <>
                      <ETHAmount
                        amount={juror && juror.lockedTokens}
                        decimals={10}
                      />{' '}
                      PNK
                    </>
                  }
                />
              </StyledBottomDiv>
            </PNKCol>
          </Row>
        </Col>
        <StyledLightPurpleArrowBackground />
      </Row>
    </StyledCard>
  )
}

export default PNKBalanceCard
