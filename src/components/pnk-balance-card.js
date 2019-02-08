import { Card, Col, Row } from 'antd'
import { useDrizzle, useDrizzleState } from '../temp/drizzle-react-hooks'
import ETHAddress from './eth-address'
import ETHAmount from './eth-amount'
import Hint from '../components/hint'
import Identicon from '../components/identicon'
import React from 'react'
import { ReactComponent as SectionArrow } from '../assets/images/section-arrow.svg'
import { ReactComponent as SectionArrowBackground } from '../assets/images/section-arrow-background.svg'
import styled from 'styled-components/macro'

const StyledCard = styled(Card)`
  cursor: initial;
  margin: 28px 0;

  .ant-card-body {
    padding: 18px 36px;

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
const StyledSectionArrow = styled(SectionArrow)`
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);

  @media (max-width: 991px) {
    display: none;
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
`
const StyledBottomDiv = styled.div`
  font-size: 18px;
  font-weight: bold;
`
const StyledCol = styled(Col)`
  z-index: 0;
`
const StyledSectionArrowBackground = styled(SectionArrowBackground)`
  height: 138px;
  position: absolute;
  right: -37px;
  top: -18px;
  width: 100%;
  z-index: -1;

  @media (max-width: 991px) {
    right: -19px;
  }
`
const PNKBalanceCard = () => {
  const { useCacheCall } = useDrizzle()
  const drizzleState = useDrizzleState(drizzleState => ({
    account: drizzleState.accounts[0],
    balance: drizzleState.accountBalances[drizzleState.accounts[0]]
  }))
  const juror = useCacheCall('KlerosLiquid', 'jurors', drizzleState.account)
  return (
    <StyledCard hoverable>
      <Row>
        <Col lg={8}>
          <Row>
            <Col lg={11} xs={12}>
              <Identicon large />
            </Col>
            <Col lg={13} xs={12}>
              <StyledDiv>
                <ETHAddress address={drizzleState.account} />
              </StyledDiv>
              <StyledDiv>
                <ETHAmount
                  amount={useCacheCall(
                    'MiniMeTokenERC20',
                    'balanceOf',
                    drizzleState.account
                  )}
                />{' '}
                PNK
              </StyledDiv>
              <StyledDiv>
                <ETHAmount amount={drizzleState.balance} decimals={4} /> ETH
              </StyledDiv>
            </Col>
          </Row>
          <StyledSectionArrow className="ternary-stroke" />
        </Col>
        <Col className="ternary-color theme-color" lg={8}>
          <StyledTopDiv>You have</StyledTopDiv>
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
                    decimals={10}
                  />{' '}
                  PNK
                </>
              }
            />
          </StyledBottomDiv>
        </Col>
        <StyledCol className="ternary-color theme-color" lg={8}>
          <StyledTopDiv>You have</StyledTopDiv>
          <StyledCenterDiv>
            <ETHAmount amount={juror && juror.lockedTokens} /> PNK
          </StyledCenterDiv>
          <StyledBottomDiv>
            Locked{' '}
            <Hint
              description="This PNK is locked in active disputes for potential redistribution."
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
          <StyledSectionArrowBackground />
        </StyledCol>
      </Row>
    </StyledCard>
  )
}

export default PNKBalanceCard
