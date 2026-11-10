import React from "react";
import styled from "styled-components/macro";
import { Card, Col, Row } from "antd";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { ReactComponent as Reward } from "../assets/images/reward.svg";
import { ReactComponent as PurpleArrowBackground } from "../assets/images/purple-arrow.svg";
import { ReactComponent as LightPurpleArrowBackground } from "../assets/images/light-purple-arrow.svg";
import { VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import ETHAmount from "./eth-amount";
import useChainId from "../hooks/use-chain-id";
import useGetShifts from "../hooks/use-get-shifts";

const { useDrizzle, useDrizzleState } = drizzleReactHooks;

const StyledCard = styled(Card)`
  border-radius: 12px;
  box-shadow: ${({ theme }) => theme.cardShadow};
  cursor: initial;
  margin: 60px 0 25px 0;
  overflow: hidden;
  border: none;

  .ant-card-body {
    position: relative;
    overflow: hidden;
    padding: 7px 16px;

    @media (max-width: 991px) {
      padding: 18px;
    }
  }
`;

const StyledRow = styled(Row)`
  display: flex;
  flex-wrap: wrap;
`;

const StyledDiv = styled.div`
  font-weight: bold;
  margin: 8px 0;

  @media (max-width: 991px) {
    text-align: right;
  }
`;

const StyledDivWhiteSmall = styled(StyledDiv)`
  color: ${({ theme }) => theme.textOnPurple};
  font-size: 14px;
  font-weight: 500;
  margin: 0px;
  text-align: center;

  @media (max-width: 991px) {
    color: ${({ theme }) => theme.textPrimary};
    text-align: center;
  }
`;

const StyledDivWhiteLarge = styled(StyledDiv)`
  color: ${({ theme }) => theme.textOnPurple};
  font-size: 36px;
  margin: 0px;
  text-align: center;

  @media (max-width: 1200px) {
    font-size: 28px;
  }

  @media (max-width: 991px) {
    font-size: 42px;
    color: ${({ theme }) => theme.textPrimary};
    text-align: center;
  }
`;

const StyledTopDiv = styled.div`
  font-weight: 500;

  @media (max-width: 991px) {
    margin-top: 30px;
  }
`;

const StyledCenterDiv = styled.div`
  font-size: 36px;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 1200px) {
    font-size: 28px;
  }

  @media (max-width: 991px) {
    font-size: 42px;
  }
`;

const RewardsCol = styled(Col)`
  display: flex;
  gap: 1rem;
  padding: 12px 16px;

  @media (max-width: 991px) {
    justify-content: flex-start;
    text-align: left;
  }

  > div:last-of-type {
    display: flex;
    flex-direction: column;
    justify-content: center;

    @media (max-width: 991px) {
      align-items: flex-start;
      text-align: left;
    }
  }
`;

const StyledRewardLogoWrapper = styled.div`
  max-width: 100px;
  min-width: 80px;

  @media (max-width: 991px) {
    max-width: none;
  }
`;

const AmountCol = styled(Col)`
  display: flex;
  justify-content: center;
  align-items: center;
  color: ${({ theme }) => theme.textPrimary};
  text-align: center;

  @media (max-width: 991px) {
    justify-content: flex-start;
    text-align: left;
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
const ETHOffset = styled.div``;
const PNKOffset = styled.div``;

const RewardCard = () => {
  const { drizzle } = useDrizzle();
  const drizzleState = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
    balance: drizzleState.accounts[0] ? drizzleState.accountBalances[drizzleState.accounts[0]] : 0,
  }));
  const chainId = useChainId();
  const rewards = useGetShifts(chainId, `address: "${drizzleState.account}"`);

  let ethRewards = drizzle.web3.utils.toBN("0");
  let pnkRewards = drizzle.web3.utils.toBN("0");
  if (rewards)
    for (const reward of rewards) {
      ethRewards = ethRewards.add(drizzle.web3.utils.toBN(reward.ETHAmount));
      pnkRewards = pnkRewards.add(drizzle.web3.utils.toBN(reward.tokenAmount));
    }

  return (
    <StyledCard>
      <StyledPurpleArrowBackground />
      <Row>
        <Col lg={24} style={{ zIndex: "1" }}>
          <StyledRow gutter={[16, 16]}>
            <RewardsCol lg={8} xs={24}>
              <StyledRewardLogoWrapper>
                <Reward />
              </StyledRewardLogoWrapper>
              <div>
                <StyledDivWhiteSmall>Coherence</StyledDivWhiteSmall>
                <StyledDivWhiteLarge>Rewards</StyledDivWhiteLarge>
              </div>
            </RewardsCol>
            <AmountCol lg={8} xs={24}>
              <ETHOffset>
                <StyledTopDiv>Total</StyledTopDiv>
                <StyledCenterDiv>
                  <ETHAmount amount={ethRewards} decimals={3} tokenSymbol={true} />
                </StyledCenterDiv>
              </ETHOffset>
            </AmountCol>
            <AmountCol lg={8} xs={24}>
              <PNKOffset>
                <StyledTopDiv>Total</StyledTopDiv>
                <StyledCenterDiv>
                  <ETHAmount amount={pnkRewards} decimals={0} tokenSymbol="PNK" />
                </StyledCenterDiv>
              </PNKOffset>
            </AmountCol>
          </StyledRow>
        </Col>
      </Row>
      <StyledLightPurpleArrowBackground />
    </StyledCard>
  );
};

export default RewardCard;
