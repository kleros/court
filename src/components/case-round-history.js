import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { Skeleton } from "antd";
import JustificationCard from "./justification-card";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { useAPI } from "../bootstrap/api";
import { useDataloader, VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import useChainId from "../hooks/use-chain-id";

const { useDrizzle, useDrizzleState } = drizzleReactHooks;

export default function CaseRoundHistory({ ID, dispute }) {
  const { drizzle, useCacheCall } = useDrizzle();
  const drizzleState = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
  }));
  const getMetaEvidence = useDataloader.getMetaEvidence();
  const chainId = useChainId();

  let metaEvidence;
  if (dispute)
    if (dispute.ruled) {
      metaEvidence = getMetaEvidence(chainId, dispute.arbitrated, drizzle.contracts.KlerosLiquid.address, ID, {
        strict: false,
      });
    } else {
      metaEvidence = getMetaEvidence(chainId, dispute.arbitrated, drizzle.contracts.KlerosLiquid.address, ID);
    }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const votesInfo = useCacheCall(["KlerosLiquid"], (call) => {
    const dispute2 = call("KlerosLiquid", "getDispute", ID);
    const _justifications = useAPI.getJustifications(drizzle.web3, drizzleState.account, { appeal: 0, disputeID: ID });
    let votesInfo = {
      jurorSet: new Set(),
      votes: [],
      loading: true,
    };
    if (metaEvidence && dispute2 && _justifications && _justifications !== "pending") {
      const justificationsList = _justifications.payload.justifications.Items;
      votesInfo.loading = false;
      for (let i = 0; i < parseInt(dispute2.votesLengths[0]); i++) {
        const vote = call("KlerosLiquid", "getVote", ID, 0, i.toString());
        if (vote) {
          const juror = vote.account;
          if (vote.voted && !votesInfo.jurorSet.has(juror)) {
            votesInfo.jurorSet.add(juror);
            votesInfo.votes.push({
              choice: vote.choice,
              justification: justificationsList.find((j) => j.voteID.N === i.toString())?.justification.S,
            });
          }
        } else {
          votesInfo.loading = true;
        }
      }
    }
    return votesInfo;
  });

  return (
    <StyledCaseRoundHistory>
      <JustificationsBox>
        <Skeleton active loading={!votesInfo || votesInfo.loading || !metaEvidence}>
          {votesInfo && metaEvidence && votesInfo.votes.length > 0 ? (
            votesInfo.votes.map(({ justification, choice }, i) => (
              <React.Fragment key={i}>
                <JustificationCard
                  {...{
                    justification,
                    choiceTitle: metaEvidence.metaEvidenceJSON.rulingOptions.titles[choice - 1],
                    index: i + 1,
                  }}
                />
                {i + 1 < votesInfo.votes.length && <Break />}
              </React.Fragment>
            ))
          ) : (
            <h5>No se ha votado aún</h5>
          )}
        </Skeleton>
      </JustificationsBox>
    </StyledCaseRoundHistory>
  );
}

const Break = styled.hr`
  border-top: 1px solid #d09cff;
  width: 100%;
  margin: 0px;
`;

CaseRoundHistory.propTypes = {
  ID: t.string.isRequired,
  dispute: t.object.isRequired,
  ruling: t.oneOfType([t.number, t.string]),
};

CaseRoundHistory.defaultProps = {
  disabled: false,
};

const StyledCaseRoundHistory = styled.div`
  .ant-row {
    height: 100%;
  }
`;

const Box = styled.div`
  padding: 28px 43px;
`;

const JustificationsBox = styled(Box)`
  height: 100%;
  text-align: center;
  @media (max-width: 768px) {
    border-top: 1px solid #4d00b4;
  }
  display: flex;
  flex-direction: column;
  gap: 28px;
  h2 {
    color: #4d00b4;
    font-size: 24px;
    font-weight: 500;
    line-height: 28px;
    margin-bottom: 60px;
  }
`;
