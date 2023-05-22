import { useConfig } from "@usedapp/core";
import { Skeleton } from "antd";
import t from "prop-types";
import React, { useEffect, useState } from "react";
import JustificationCard from "./justification-card";

import styled from "styled-components/macro";
import { getReadOnlyWeb3 } from "../bootstrap/web3";
import useContract from "../hooks/use-contract";
export default function CaseRoundHistory({ ID, dispute, metaEvidence }) {
  const config = useConfig();
  console.log("chain,d 11", config.readOnlyChainId);
  const { provider } = getReadOnlyWeb3({ chainId: config.readOnlyChainId });
  const { klerosLiquid } = useContract({ chainID: config.readOnlyChainId });
  const [votesInfoData, setVotesInfoData] = useState();

  // useEffect(() => {
  //   getVotesInfo();
  // }, [ID]);
  // const votesInfo = useCacheCall(["KlerosLiquid"], (call) => {
  //   const dispute2 = call("KlerosLiquid", "getDispute", ID);
  //   const _justifications = useAPI.getJustifications({ appeal: 0, disputeID: ID });
  //   let votesInfo = {
  //     votes: [],
  //     loading: true,
  //   };
  //   if (metaEvidence && dispute2 && _justifications && _justifications !== "pending") {
  //     const justificationsList = _justifications.payload.justifications.Items;
  //     votesInfo.loading = false;
  //     for (let i = 0; i < dispute2.votesLengths.length; i++) {
  //       const vote = call("KlerosLiquid", "getVote", ID, 0, i.toString());
  //       if (vote) {
  //         if (vote.voted) {
  //           votesInfo.votes.push({
  //             choice: vote.choice,
  //             justification: justificationsList.find((j) => j.voteID.N === i.toString())?.justification.S,
  //           });
  //         }
  //       } else {
  //         votesInfo.loading = true;
  //       }
  //     }
  //   }
  //   return votesInfo;
  // });

  const getJustificationsData = async () => {
    try {
      const data = await fetch(process.env.REACT_APP_JUSTIFICATIONS_URL, {
        body: JSON.stringify({
          payload: {
            address: "0x0000000000000000000000000000000000000000",
            network: "mainnet",
            payload: "justification",
            disputeID: ID,
            appeal: 0,
          },
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }).then((res) => res.json());

      console.log("justification data", data);

      let votesInfo = {
        votes: [],
        loading: true,
      };
      if (metaEvidence && dispute && data && data !== "pending") {
        const justificationsList = data.payload.justifications.Items;
        votesInfo.loading = false;
        for (let i = 0; i < dispute.votesLengths.length; i++) {
          console.log("dispute.votesLengths.length", dispute);
          const vote = await klerosLiquid.getVote(ID, 0, i.toString());
          console.log("🚀 ~ file: case-round-history.js:75 ~ getJustificationsData ~ vote:", vote);
          if (vote) {
            console.log("justificationsList", justificationsList);
            if (vote.voted) {
              console.log("vote.choice.toString()", vote.choice.toString());
              votesInfo.votes.push({
                choice: vote.choice.toString(),
                // justification: justificationsList[i].justification.S,
                justification: justificationsList.find((j) => j.voteID.N === i.toString())?.justification.S,
              });
            }
          } else {
            votesInfo.loading = true;
          }
        }
      }
      console.log("votesInfo", votesInfo);
      setVotesInfoData(votesInfo);
      return votesInfo;
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(async () => {
    await getJustificationsData();
  }, []);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  // const getVotesInfo = async () => {
  //   const _justifications = await useAPI.getJustifications({ appeal: 0, disputeID: ID });
  //   let votesInfo = {
  //     votes: [],
  //     loading: true,
  //   };
  //   if (metaEvidence && dispute && _justifications && _justifications !== "pending") {
  //     const justificationsList = _justifications.payload.justifications.Items;
  //     votesInfo.loading = false;
  //     for (let i = 0; i < dispute.votesLengths.length; i++) {
  //       const vote = await klerosLiquid.getVote(ID, 0, i.toString());
  //       if (vote) {
  //         if (vote.voted) {
  //           votesInfo.votes.push({
  //             choice: vote.choice,
  //             justification: justificationsList.find((j) => j.voteID.N === i.toString())?.justification.S,
  //           });
  //         }
  //       } else {
  //         votesInfo.loading = true;
  //       }
  //     }
  //   }
  //   setVotesInfo(votesInfo);
  //   return votesInfo;
  // };

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
//   return (
//     <StyledCaseRoundHistory>
//       <JustificationsBox>
//         <Skeleton>
//           <h5>No se ha votado aún</h5>
//         </Skeleton>
//       </JustificationsBox>
//     </StyledCaseRoundHistory>
//   );
// }

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
