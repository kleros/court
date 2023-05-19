import React from "react";
import { getReadOnlyWeb3 } from "../bootstrap/web3";
import useContract from "../hooks/use-contract";
import usePromise from "../hooks/use-promise";

export default function useVoteData(dispute, drawnInCurrentRound, draws, ID, disputeExtraInfo, voteCounter) {
  const { klerosLiquid } = useContract({ chainID: 1 });
  const { provider } = getReadOnlyWeb3({ chainId: 1 });
  const vote = usePromise(
    React.useCallback(() => klerosLiquid.getVote(ID, draws.args._appeal, draws.args._voteID), [ID])
  );
  const subcourt = usePromise(React.useCallback(() => klerosLiquid.courts(dispute.subcourtID), [dispute.subcourtID]));

  console.log("🚀 ~ file: case-details-card.js:17 ~ getVoteData ~ vote:", vote);
  console.log("🚀 ~ file: case-details-card.js:20 ~ getVoteData ~ subcourt:", subcourt);

  const disputeVoteLength = disputeExtraInfo.value?.votesLengths[0].toString();

  if (!drawnInCurrentRound || (vote && subcourt)) {
    const committed =
      drawnInCurrentRound && vote.commit !== "0x0000000000000000000000000000000000000000000000000000000000000000";
    if (draws.isFulfilled) {
      let votesData = draws.value.reduce(
        (acc, d) => {
          console.log("acc", acc);
          console.log("d", d);
          if (d.args._appeal.toString() === disputeVoteLength - 1) acc.voteIDs.push(d.args._voteIDs.toString());
          return acc;
        },
        {
          canVote:
            drawnInCurrentRound &&
            ((dispute.period === "1" && !committed) ||
              (dispute.period === "2" && (!subcourt.hiddenVotes || committed) && !vote.voted)),
          committed,
          commit: vote.commit,
          currentRuling: voteCounter?.winningChoice,
          drawnInCurrentRound,
          loading: !voteCounter,
          voteIDs: [],
          voted: vote.voted && vote.choice,
        }
      );
    }
  }

  return { vote, subcourt };
}
