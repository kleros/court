import { Card, Col, Row } from 'antd'
import React from 'react'
import { ReactComponent as PurpleArrowBackground } from '../assets/images/purple-arrow.svg'
import { ReactComponent as LightPurpleArrowBackground } from '../assets/images/light-purple-arrow.svg'
import { drizzleReactHooks } from '@drizzle/react-plugin'
import ETHAmount from './eth-amount'
import Hint from './hint'
import styled from 'styled-components/macro'
import { VIEW_ONLY_ADDRESS } from '../bootstrap/dataloader'

const { useDrizzle, useDrizzleState } = drizzleReactHooks

const StyledCard = styled(Card)`
  border-radius: 12px;
  box-shadow: 0px 6px 36px #bc9cff;
  cursor: initial;
  margin: 60px 0 25px 0;

  .ant-card-body {
    padding: 7px 36px;

    @media (max-width: 991px) {
      padding: 18px;
    }
  }
`
const StyledDiv = styled.div`
  color: #4004a3;
  font-weight: bold;
  margin-top: 8px;
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
const StyledCenterDiv = styled.div`
  color: #4004a3;
  font-size: 36px;
  font-weight: bold;

  @media (max-width: 1200px) {
    font-size: 28px;
  }
`
const StyledBottomDiv = styled.div`
  color: #4004a3;
  font-size: 14px;
  font-weight: bold;
`
const StyledPurpleArrowBackground = styled(PurpleArrowBackground)`
  height: 138px;
  left: -36px;
  position: absolute;
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
const PNKCol = styled(Col)`
  padding-left: 58px;

  @media (max-width: 500px) {
    padding-left: 0;
  }
`

const PNKBalanceCard = () => {
  const { useCacheCall } = useDrizzle()
  const drizzleState = useDrizzleState(drizzleState => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
    balance: drizzleState.accounts[0]
        ? drizzleState.accountBalances[drizzleState.accounts[0]]
        : 0
  }))
  const juror = useCacheCall(
    'KlerosLiquidExtraViews',
    'getJuror',
    drizzleState.account
  )
  return (
    <StyledCard>
      <Row>
        <StyledPurpleArrowBackground />
        <Col lg={24} style={{ zIndex: '1' }}>
          <Row>
            <PNKCol lg={8} xs={24}>
              <StyledDivWhiteSmall>Your wallet balance</StyledDivWhiteSmall>
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
              <StyledBottomDiv style={{ color: 'white' }}>
                <ETHAmount amount={drizzleState.balance} decimals={4} /> ETH
              </StyledBottomDiv>
            </PNKCol>
            <PNKCol lg={8} xs={24}>
              <StyledDiv>You Have</StyledDiv>
              <StyledCenterDiv>
                <ETHAmount amount={juror && juror.stakedTokens} /> PNK
              </StyledCenterDiv>
              <StyledBottomDiv>
                Staked{' '}
                <Hint
                  description="The more you stake, the higher your chances of being drawn as a juror."
                  title={
                    <>
                      <ETHAmount amount={juror && juror.stakedTokens} /> PNK
                    </>
                  }
                />
              </StyledBottomDiv>
            </PNKCol>
            <PNKCol lg={8} xs={12}>
              <StyledDiv>You Have</StyledDiv>
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
