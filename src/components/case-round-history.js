import { useConfig } from "@usedapp/core";
import { Skeleton } from "antd";
import t from "prop-types";
import React, { useEffect, useState } from "react";
import JustificationCard from "./justification-card";

import styled from "styled-components/macro";
import useContract from "../hooks/use-contract";

const chainIdToNetwork = {
  1: "mainnet",
  5: "goerli",
  100: "xdai",
  10200: "chiado",
};

export default function CaseRoundHistory({ ID, dispute, metaEvidence }) {
  const config = useConfig();
  const { klerosLiquid } = useContract({ chainID: config.readOnlyChainId });
  const [votesInfoData, setVotesInfoData] = useState();

  const getJustificationsData = async () => {
    try {
      const data = await fetch(process.env.REACT_APP_JUSTIFICATIONS_URL, {
        body: JSON.stringify({
          payload: {
            address: "0x0000000000000000000000000000000000000000",
            network: chainIdToNetwork[config.readOnlyChainId],
            payload: "justification",
            disputeID: ID,
            appeal: 0,
          },
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      })
        .then((res) => res.json())
        .catch((err) => console.error(err));

      let votesInfo = {
        votes: [],
        loading: true,
      };
      if (metaEvidence && dispute && data && data !== "pending") {
        const justificationsList = data.payload.justifications.Items;
        votesInfo.loading = false;
        for (let i = 0; i < dispute.votesLengths.length; i++) {
          const vote = await klerosLiquid.getVote(ID, 0, i.toString());
          if (vote) {
            if (vote.voted) {
              votesInfo.votes.push({
                choice: vote.choice.toString(),
                justification: justificationsList.find((j) => j.voteID.N === i.toString())?.justification.S,
              });
            }
          } else {
            votesInfo.loading = true;
          }
        }
      }
      setVotesInfoData(votesInfo);
      return votesInfo;
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await getJustificationsData();
    };

    fetchData();
  }, []);

  return (
    <StyledCaseRoundHistory>
      <JustificationsBox>
        <Skeleton active loading={!votesInfoData || !metaEvidence}>
          {votesInfoData && metaEvidence && votesInfoData.votes.length > 0 ? (
            votesInfoData.votes.map(({ justification, choice }, i) => (
              <React.Fragment key={i}>
                <JustificationCard
                  {...{
                    justification,
                    choiceTitle: metaEvidence.metaEvidenceJSON.rulingOptions.titles[choice - 1],
                    index: i,
                  }}
                />
                {i + 1 < votesInfoData.votes.length && <Break />}
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
  metaEvidence: t.any,
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
