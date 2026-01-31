import React from "react";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { ReactComponent as Hourglass } from "../assets/images/hourglass.svg";
import ListItem from "./list-item";
import TimeAgo from "./time-ago";
import TitledListCard from "./titled-list-card";
import styled from "styled-components/macro";
import { VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import useChainId from "../hooks/use-chain-id";
import useGetDraws from "../hooks/use-get-draws";

const { useDrizzle, useDrizzleState } = drizzleReactHooks;

const StyledDiv = styled.div`
  background: ${({ theme }) => theme.elevatedBackground};
  padding: 30px 22px;
  position: relative;
  text-align: center;
`;
const StyledDeadlineDiv = styled.div`
  font-weight: medium;
`;
const StyledTimeAgo = styled(TimeAgo)`
  font-size: 24px;
  font-weight: bold;
`;
const StyledHourglass = styled(Hourglass)`
  position: absolute;
  right: 13px;
  top: 13px;
`;
const CasesListCard = () => {
  const { useCacheCall } = useDrizzle();
  const drizzleState = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
  }));
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
            acc.total++;
            const dispute = call("KlerosLiquid", "disputes", d.disputeID);
            if (dispute)
              if (dispute.period === "1" || dispute.period === "2") {
                const dispute2 = call("KlerosLiquid", "getDispute", d.disputeID);
                if (dispute2)
                  if (Number(d.appeal) === dispute2.votesLengths.length - 1) {
                    const vote = call("KlerosLiquid", "getVote", d.disputeID, d.appeal, d.voteID);
                    if (vote)
                      if (vote.voted) acc.active++;
                      else {
                        acc.votePending++;
                        const subcourt = call("KlerosLiquid", "getSubcourt", dispute.subcourtID);
                        if (subcourt) {
                          const deadline = new Date(
                            (Number(dispute.lastPeriodChange) + Number(subcourt.timesPerPeriod[dispute.period])) * 1000
                          );
                          if (!acc.deadline || deadline < acc.deadline) acc.deadline = deadline;
                        } else acc.loading = true;
                      }
                    else acc.loading = true;
                  } else acc.active++;
                else acc.loading = true;
              } else acc[dispute.period === "4" ? "executed" : "active"]++;
            else acc.loading = true;
            return acc;
          },
          { active: 0, executed: 0, loading: false, total: 0, votePending: 0 }
        )
      : { loading: true }
  );

  return (
    <TitledListCard loading={disputes.loading} prefix={disputes.total} title="Cases">
      <ListItem extra={String(disputes.votePending)}>Vote Pending</ListItem>
      <ListItem extra={String(disputes.active)}>Active</ListItem>
      <ListItem extra={String(disputes.executed)}>Closed</ListItem>
      {disputes.deadline && (
        <StyledDiv className="primary-color theme-color">
          <StyledDeadlineDiv>Next voting deadline</StyledDeadlineDiv>
          <StyledTimeAgo>{disputes.deadline}</StyledTimeAgo>
          <StyledHourglass className="primary-fill" />
        </StyledDiv>
      )}
    </TitledListCard>
  );
};

export default CasesListCard;
