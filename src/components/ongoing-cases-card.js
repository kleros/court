import { Col, Row } from "antd";
import React from "react";
import styled from "styled-components/macro";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { useDataloader, VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import { ReactComponent as Gavel } from "../assets/images/gavel.svg";
import { ReactComponent as HourGlass } from "../assets/images/hourglass.svg";
import useChainId from "../hooks/use-chain-id";
import CaseSummaryCard from "./case-summary-card";
import TitledListCard from "./titled-list-card";
import ListItem from "./list-item";
import useGetDraws from "../hooks/use-get-draws";

const { useDrizzle, useDrizzleState } = drizzleReactHooks;

const StyledDiv = styled.div`
  margin-top: 50px;
`;

const StyledPending = styled.div`
  color: ${({ theme }) => theme.mutedText};
  svg {
    height: 12px;
    path {
      fill: ${({ theme }) => theme.mutedText};
    }
  }
`;
const StyledVoting = styled.div`
  color: ${({ theme }) => theme.primaryColor};
  svg {
    height: 12px;
    path {
      fill: ${({ theme }) => theme.primaryColor};
    }
  }
`;
const StyledExecuted = styled.div`
  color: ${({ theme }) => theme.dangerColor};
  svg {
    height: 12px;
    path {
      fill: ${({ theme }) => theme.dangerColor};
    }
  }
`;
const StyledAppealed = styled.div`
  color: ${({ theme }) => theme.dangerColor};
  svg {
    height: 12px;
    path {
      fill: ${({ theme }) => theme.dangerColor};
    }
  }
`;
const StyledGavelContainer = styled.div`
  svg {
    height: 30px;
    width: 30px;
    path {
      fill: ${({ theme }) => theme.textOnPurple};
    }
  }
`;

const OngoingCasesCard = () => {
  const { drizzle, useCacheCall } = useDrizzle();
  const getMetaEvidence = useDataloader.getMetaEvidence();
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
            const dispute = call("KlerosLiquid", "disputes", d.disputeID);
            if (dispute)
              if (dispute.period === "1" || dispute.period === "2") {
                const dispute2 = call("KlerosLiquid", "getDispute", d.disputeID);
                if (dispute2) {
                  const metaEvidence = getMetaEvidence(
                    chainId,
                    dispute.arbitrated,
                    drizzle.contracts.KlerosLiquid.address,
                    d.disputeID
                  );

                  if (Number(d.appeal) === dispute2.votesLengths.length - 1) {
                    const vote = call("KlerosLiquid", "getVote", d.disputeID, d.appeal, d.voteID);
                    if (vote)
                      acc[vote.voted ? "active" : "votePending"].push({
                        metaEvidence,
                        statusDiv: (
                          <StyledVoting>
                            Voting <Gavel />
                          </StyledVoting>
                        ),
                        ID: d.disputeID,
                      });
                    else acc.loading = true;
                  } else
                    acc.active.push({
                      ...metaEvidence,
                      statusDiv: (
                        <StyledAppealed>
                          Appealed <Gavel />
                        </StyledAppealed>
                      ),
                      ID: d.disputeID,
                    });
                } else acc.loading = true;
              } else {
                const metaEvidence = getMetaEvidence(
                  chainId,
                  dispute.arbitrated,
                  drizzle.contracts.KlerosLiquid.address,
                  d.disputeID
                );

                if (dispute.period === "4")
                  acc.executed.push({
                    metaEvidence,
                    statusDiv: (
                      <StyledExecuted>
                        Executed <HourGlass />
                      </StyledExecuted>
                    ),
                    ID: d.disputeID,
                  });
                else
                  acc.active.push({
                    metaEvidence,
                    statusDiv: (
                      <StyledPending>
                        Pending <HourGlass />
                      </StyledPending>
                    ),
                    ID: d.disputeID,
                  });
              }
            else acc.loading = true;
            return acc;
          },
          { active: [], executed: [], loading: false, votePending: [] }
        )
      : { active: [], executed: [], loading: true, votePending: [] }
  );

  const _allActive = disputes.votePending.reverse().concat(disputes.active.reverse());

  return (
    <StyledDiv>
      {_allActive.length > 0 ? (
        <>
          <TitledListCard
            prefix={
              <StyledGavelContainer>
                <Gavel />
              </StyledGavelContainer>
            }
            title="Ongoing Cases"
          />
          <Row>
            {_allActive.slice(0, 3).map((_dispute, i) => (
              <Col key={`case-summary-${i}`} lg={8}>
                <CaseSummaryCard dispute={_dispute} />
              </Col>
            ))}
          </Row>
        </>
      ) : (
        <TitledListCard
          prefix={
            <StyledGavelContainer>
              <Gavel />
            </StyledGavelContainer>
          }
          title="Ongoing Cases"
        >
          <ListItem key="Ongoing-Cases-None">You have no ongoing cases</ListItem>
        </TitledListCard>
      )}
    </StyledDiv>
  );
};

export default OngoingCasesCard;
