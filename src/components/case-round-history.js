import React, { useState, useEffect } from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { Skeleton } from "antd";
import JustificationCard from "./justification-card";
import { useAPI } from "../bootstrap/api";
import useContract from "../hooks/use-contract";

export default function CaseRoundHistory({ ID, dispute, metaEvidence }) {
  // const { klerosLiquid } = useContract({ chainID: 1 });
  // const [votesInfo, setVotesInfo] = useState();

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

  // return (
  //   <StyledCaseRoundHistory>
  //     <JustificationsBox>
  //       <Skeleton active loading={!votesInfo || !metaEvidence}>
  //         {votesInfo && metaEvidence && votesInfo.votes.length > 0 ? (
  //           votesInfo.votes.map(({ justification, choice }, i) => (
  //             <React.Fragment key={i}>
  //               <JustificationCard
  //                 {...{
  //                   justification,
  //                   choiceTitle: metaEvidence.metaEvidenceJSON.rulingOptions.titles[choice - 1],
  //                   index: i,
  //                 }}
  //               />
  //               {i + 1 < votesInfo.votes.length && <Break />}
  //             </React.Fragment>
  //           ))
  //         ) : (
  //           <h5>No se ha votado aún</h5>
  //         )}
  //       </Skeleton>
  //     </JustificationsBox>
  //   </StyledCaseRoundHistory>
  // );
  return (
    <StyledCaseRoundHistory>
      <JustificationsBox>
        <Skeleton>
          <h5>No se ha votado aún</h5>
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
