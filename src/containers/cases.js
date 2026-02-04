import { Col, Radio, Row, Spin } from "antd";
import React, { useCallback, useState } from "react";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import CaseCard from "../components/case-card";
import TopBanner from "../components/top-banner";
import styled from "styled-components/macro";
import { VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import useChainId from "../hooks/use-chain-id";
import useGetDraws from "../hooks/use-get-draws";

const { useDrizzle, useDrizzleState } = drizzleReactHooks;

export default function Cases() {
  const { useCacheCall } = useDrizzle();
  const drizzleState = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
  }));
  const [filter, setFilter] = useState(0);
  const chainId = useChainId();
  const draws = useGetDraws(chainId, `address: "${drizzleState.account}"`);

  const disputes = useCacheCall(["KlerosLiquid"], (call) =>
    draws
      ? Object.values(
          draws.reduce((acc, d) => {
            acc[d.disputeID] = d;
            return acc;
          }, {})
        ).reduce(
          (acc, d) => {
            const dispute = call("KlerosLiquid", "disputes", d.disputeID);
            if (!dispute) {
              acc.loading = true;
              return acc;
            }

            const numberOfVotes = draws.filter((_draw) => _draw.disputeID === d.disputeID);
            const dispute2 = call("KlerosLiquid", "getDispute", d.disputeID);

            if (!dispute2) {
              return acc;
            }

            if (dispute.period === "4") {
              acc.executed.push({
                ID: d.disputeID,
                draws: numberOfVotes,
              });
              return acc;
            }

            if (Number(d.appeal) !== dispute2.votesLengths.length - 1) {
              acc.active.push({
                ID: d.disputeID,
                draws: numberOfVotes,
                status: 1,
              });
              return acc;
            }

            if (dispute.period === "1") {
              const vote = call("KlerosLiquid", "getVote", d.disputeID, d.appeal, d.voteID);
              const isVoteCommitted = parseInt(vote?.commit, 16) !== 0;
              acc[vote?.voted ? "active" : "votePending"].push({
                ID: d.disputeID,
                draws: numberOfVotes,
                status: !isVoteCommitted ? 0 : 1,
                isVoteCommitted: isVoteCommitted,
              });
            } else if (dispute.period === "2") {
              const vote = call("KlerosLiquid", "getVote", d.disputeID, d.appeal, d.voteID);
              acc[vote?.voted ? "active" : "votePending"].push({
                ID: d.disputeID,
                draws: numberOfVotes,
                status: !vote?.voted ? 0 : 1,
              });
            } else {
              acc[dispute.period === "4" ? "executed" : "active"].push({
                ID: d.disputeID,
                draws: numberOfVotes,
              });
            }

            return acc;
          },
          { active: [], executed: [], loading: false, votePending: [] }
        )
      : { active: [], executed: [], loading: true, votePending: [] }
  );

  const filteredDisputes = disputes[["votePending", "active", "executed"][filter]];
  const sortedDisputes = [...filteredDisputes].sort((a, b) => a.status - b.status);

  return (
    <>
      <TopBanner
        description="Select a case you have been drawn in, study the evidence, and vote."
        extra={
          <StyledRadioGroup
            buttonStyle="solid"
            name="filter"
            onChange={useCallback((e) => setFilter(e.target.value), [])}
            value={filter}
          >
            <StyledRadioButton value={0}>Vote Pending</StyledRadioButton>
            <StyledRadioButton value={1}>In Progress</StyledRadioButton>
            <StyledRadioButton value={2}>Closed</StyledRadioButton>
          </StyledRadioGroup>
        }
        title="My Cases"
      />
      <Spin spinning={disputes.loading}>
        <Row gutter={48}>
          {sortedDisputes.length === 0 ? (
            <StyledCol>You don&rsquo;t have any {["pending", "active", "closed"][filter]} cases.</StyledCol>
          ) : (
            sortedDisputes.map((dispute) => (
              <Col key={dispute.ID} md={12} xl={8}>
                <CaseCard ID={dispute.ID} draws={dispute.draws} isVoteCommitted={dispute.isVoteCommitted} />
              </Col>
            ))
          )}
        </Row>
      </Spin>
    </>
  );
}

const StyledRadioGroup = styled(Radio.Group)`
  display: flex;
  gap: 10px;

  @media (max-width: 575.98px) {
    flex-wrap: wrap;
  }
`;

const StyledRadioButton = styled(Radio.Button)`
  @media (max-width: 575.98px) {
    text-align: center;
  }
`;

const StyledCol = styled(Col)`
  color: ${({ theme }) => theme.borderColor};
  font-size: 24px;
  font-weight: 500;
  line-height: 28px;
  text-align: center;
`;
