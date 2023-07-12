import React from "react";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import PercentageCircle from "./percentage-circle";
import { Spin } from "antd";
import TitledListCard from "./titled-list-card";
import styled from "styled-components/macro";
import { VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import useChainId from "../hooks/use-chain-id";
import useGetShifts from "../hooks/use-get-shifts";

const { useDrizzleState } = drizzleReactHooks;

const StyledDiv = styled.div`
  align-items: center;
  display: flex;
  justify-content: center;
  padding: 30px;

  & > div {
    flex: 1;
  }
`;
const StyledText = styled.div`
  color: #4004a3;
  font-size: 18px;
  margin-top: 15px;
  text-align: center;
`;
const StyledGraphContainer = styled.div`
  margin: auto;
  margin-bottom: 15px;
  width: 40%;
`;

const PNKStatsListCard = () => {
  const drizzleState = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
  }));

  let loadingData = true;
  const chainId = useChainId();
  const rewards = useGetShifts(chainId, `address: "${drizzleState.account}"`);

  if (rewards) loadingData = false;

  let totalCases = 0;
  let coherentVote = 0;
  let lastSeenDispute = -1;
  if (!loadingData)
    for (const reward of rewards)
      if (Number(reward.disputeID) !== lastSeenDispute) {
        totalCases++;
        lastSeenDispute = Number(reward.disputeID);
        if (Number(reward.ETHAmount) > 0) coherentVote++;
      }

  const percent = !loadingData && rewards.length ? (coherentVote / totalCases).toFixed(2) * 100 : 0;

  return (
    <TitledListCard prefix="%" title="Voting Performance">
      <StyledDiv>
        <Spin spinning={loadingData}>
          <StyledGraphContainer>
            <PercentageCircle percent={percent} />
          </StyledGraphContainer>
          <StyledText>Cases Coherent</StyledText>
        </Spin>
      </StyledDiv>
    </TitledListCard>
  );
};

export default PNKStatsListCard;
