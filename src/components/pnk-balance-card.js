import React from "react";
import styled from "styled-components/macro";
import { Card, Col, Row } from "antd";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { ReactComponent as LightPurpleArrowBackground } from "../assets/images/light-purple-arrow.svg";
import { ReactComponent as PurpleArrowBackground } from "../assets/images/purple-arrow.svg";
import { VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import ETHAmount from "./eth-amount";
import Hint from "./hint";

const { useDrizzle, useDrizzleState } = drizzleReactHooks;

const StyledCard = styled(Card)`
  border-radius: 12px;
  box-shadow: ${({ theme }) => theme.cardShadow};
  cursor: initial;
  margin: 60px 0 25px 0;
  overflow: hidden;
  background: ${({ theme }) => theme.cardBackground};

  .ant-card-body {
    position: relative;
    overflow: hidden;
    padding: 7px 16px;

    @media (max-width: 991px) {
      padding: 18px;
    }
  }
`;

const StyledDiv = styled.div`
  color: ${({ theme }) => theme.textPrimary};
  font-weight: bold;
  margin-top: 8px;
`;

const StyledDivWhiteSmall = styled(StyledDiv)`
  color: ${({ theme }) => theme.textOnPurple};
  font-size: 14px;
  margin-top: 8px;

  @media (max-width: 991px) {
    color: ${({ theme }) => theme.textPrimary};
  }
`;

const StyledDivWhiteLarge = styled(StyledDiv)`
  color: ${({ theme }) => theme.textOnPurple};
  font-size: 36px;
  margin: 0px;

  @media (max-width: 1200px) {
    font-size: 28px;
  }

  @media (max-width: 991px) {
    color: ${({ theme }) => theme.textPrimary};
  }
`;

const StyledCenterDiv = styled.div`
  color: ${({ theme }) => theme.textPrimary};
  font-size: 36px;
  font-weight: bold;

  @media (max-width: 1200px) {
    font-size: 28px;
  }
`;

const StyledBottomDiv = styled.div`
  color: ${({ theme }) => theme.textPrimary};
  font-size: 14px;
  font-weight: bold;

  &.white {
    color: ${({ theme }) => theme.textOnPurple};

    @media (max-width: 991px) {
      color: ${({ theme }) => theme.textPrimary};
    }
  }
`;

const StyledPurpleArrowBackground = styled(PurpleArrowBackground)`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 0;
  width: calc(33% + 1.5rem + 100px);
  transform: translateX(-100px);

  path {
    fill: ${({ theme }) => (theme.name === "dark" ? theme.gradientEnd : `url(#paint0_linear)`)};
  }

  @media (max-width: 991px) {
    display: none;
  }
`;

const StyledLightPurpleArrowBackground = styled(LightPurpleArrowBackground)`
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 0;
  width: calc(33% + 1.5rem + 100px);
  transform: translateX(100px);

  path {
    fill: ${({ theme }) => theme.elevatedBackground};
  }

  @media (max-width: 991px) {
    display: none;
  }
`;

const PNKCol = styled(Col)`
  padding-left: 58px;

  @media (max-width: 991px) {
    padding-left: 0;

    &:not(:last-of-type) {
      margin-bottom: 16px;
    }
  }
`;

const PNKBalanceCard = () => {
  const { useCacheCall } = useDrizzle();
  const drizzleState = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
    balance: drizzleState.accounts[0] ? drizzleState.accountBalances[drizzleState.accounts[0]] : 0,
  }));
  const juror = useCacheCall("KlerosLiquidExtraViews", "getJuror", drizzleState.account);
  return (
    <StyledCard>
      <StyledPurpleArrowBackground />
      <Row>
        <Col lg={24} style={{ zIndex: "1" }}>
          <Row>
            <PNKCol lg={8} xs={24}>
              <StyledDivWhiteSmall>Your wallet balance</StyledDivWhiteSmall>
              <StyledDivWhiteLarge>
                <ETHAmount
                  amount={useCacheCall("MiniMeTokenERC20", "balanceOf", drizzleState.account)}
                  decimals={0}
                  tokenSymbol="PNK"
                />
              </StyledDivWhiteLarge>
              <StyledBottomDiv className="white">
                <ETHAmount amount={drizzleState.balance} decimals={4} tokenSymbol={true} />
              </StyledBottomDiv>
            </PNKCol>
            <PNKCol lg={8} xs={24}>
              <StyledDiv>You Have</StyledDiv>
              <StyledCenterDiv>
                <ETHAmount amount={juror && juror.stakedTokens} decimals={0} tokenSymbol="PNK" />
              </StyledCenterDiv>
              <StyledBottomDiv>
                Staked{" "}
                <Hint
                  description="The more you stake, the higher your chances of being drawn as a juror."
                  title={
                    <>
                      <ETHAmount amount={juror && juror.stakedTokens} decimals={10} tokenSymbol="PNK" />
                    </>
                  }
                />
              </StyledBottomDiv>
            </PNKCol>
            <PNKCol lg={8} xs={24}>
              <StyledDiv>You Have</StyledDiv>
              <StyledCenterDiv>
                <ETHAmount amount={juror && juror.lockedTokens} tokenSymbol="PNK" />
              </StyledCenterDiv>
              <StyledBottomDiv>
                Locked{" "}
                <Hint
                  description={<>These PNK are locked in active disputes for potential redistribution.</>}
                  title={
                    <>
                      <ETHAmount amount={juror && juror.lockedTokens} tokenSymbol="PNK" />
                    </>
                  }
                />
              </StyledBottomDiv>
            </PNKCol>
          </Row>
        </Col>
      </Row>
      <StyledLightPurpleArrowBackground />
    </StyledCard>
  );
};

export default PNKBalanceCard;
