import React, { useCallback, useEffect, useState } from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { Col, Radio, Row, Skeleton } from "antd";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { useDataloader } from "../bootstrap/dataloader";
import useChainId from "../hooks/use-chain-id";
import ScrollBar from "./scroll-bar";
import axios from "axios";
import useSWR from "swr";
import Web3 from "web3";
import { RTA_LABEL } from "../temp/answer-string";

const { useDrizzle } = drizzleReactHooks;
const { toBN } = Web3.utils;

const normalizeRulingValue = (value) => {
  try {
    return toBN(value).toString();
  } catch {
    return String(value);
  }
};

const resolveRulingOption = (ruling) => (ruling == null ? null : normalizeRulingValue(ruling));

//Only show a round's vote counts once its voting is over and no more votes can enter it
const PERIOD_APPEAL = 3;
const isRoundTallyFinal = (roundIndex, currentRoundIndex, period) =>
  roundIndex < currentRoundIndex || period >= PERIOD_APPEAL;

//The getVoteCounter function in the contract uses numberOfChoices + 1 as the length of the array.
//Additionally, numberOfChoices is NOT a count of choices, but an upper bound for acceptable choice values.
//This is problematic for reality disputes, for instance, as those have a reserved answer with value 2^256 - 1.
//This means the call to getVoteCounter will revert, as the array is impossible to allocate, so we skip it instead of having drizzle keep retrying it.
//Note that 512 was chosen as a "reasonable" value. In practice, most disputes have a handful of choices at most.
const MAX_TALLYABLE_CHOICES = 512;
const isTallyableDispute = (numberOfChoices) => Number(numberOfChoices) <= MAX_TALLYABLE_CHOICES;

//Returns the number of votes for a given choice in a given round, or undefined if we can't tell
const getChoiceVoteCount = (roundVoteCounter, choiceKey) => {
  const counts = roundVoteCounter?.counts;
  if (!counts || choiceKey == null) return undefined;

  //The key is also the index in the array for the tally (e.g.: 0 = RtA)
  const index = Number(choiceKey);
  return index >= 0 && index < counts.length ? Number(counts[index]) : undefined;
};

//Drawn votes that were never cast land in no choice's total.
//This is just a QoL helper, so jurors can easily understand why individual choice tallies might not add up to the round's total votes.
const getVoteTurnoutSummary = (votesCast, votesDrawn) => {
  const cast = Number(votesCast);
  const drawn = Number(votesDrawn);
  return Number.isFinite(cast) && drawn > 0 ? `${cast} of ${drawn} votes cast` : null;
};

const VoteOptionLabel = ({ title, voteCount }) => (
  <VoteOption>
    <VoteOptionTitle>{title}</VoteOptionTitle>
    {voteCount !== undefined && <VoteOptionCount>({voteCount})</VoteOptionCount>}
  </VoteOption>
);

VoteOptionLabel.propTypes = {
  title: t.string,
  voteCount: t.number,
};

export default function CaseRoundHistory({ ID, dispute, ruling }) {
  const { drizzle, useCacheCall } = useDrizzle();
  const getMetaEvidence = useDataloader.getMetaEvidence();
  const [round, setRound] = useState(dispute.votesLengths.length - 1);
  const [rulingOption, setRulingOption] = useState(resolveRulingOption(ruling));
  const [justificationIndex, setJustificationIndex] = useState(0);
  const chainId = useChainId();

  useEffect(() => {
    setRulingOption(resolveRulingOption(ruling));
    setJustificationIndex(0);
  }, [ruling]);

  const metaEvidence = getMetaEvidence(
    chainId,
    dispute.arbitrated,
    drizzle.contracts.KlerosLiquid.address,
    ID,
    dispute.ruled
  );

  const { data: justificationsByRound, isLoading } = useSWR(
    metaEvidence && dispute && ID && chainId && ["justifications", chainId, ID, dispute.votesLengths],
    async ([_, chain, disputeId, nbRounds]) =>
      await Promise.all(
        nbRounds.map((_, i) =>
          axios
            .get(
              `${process.env.REACT_APP_JUSTIFICATIONS_URL}/get-justifications?chainId=${chain}&disputeId=${disputeId}&round=${i}`
            )
            .then((res) => res.data.payload.justifications)
            .catch(() => [])
        )
      )
  );

  const justificationsChoices = useCacheCall(["KlerosLiquid"], (call) =>
    dispute.votesLengths.map((_, i) => {
      if (!justificationsByRound || !metaEvidence) return [];
      const justs = justificationsByRound[i];
      return justs.reduce((acc, j) => {
        const vote = call("KlerosLiquid", "getVote", ID, i, j.voteID);
        if (vote?.voted) {
          const key = vote.choice.toString();
          const currentValue = acc[key];
          acc[key] = currentValue ? [...currentValue, j.justification] : [j.justification];
        }
        return acc;
      }, {});
    })
  );

  const currentRound = dispute.votesLengths.length - 1;
  const period = Number(dispute.period);
  const isTallyable = isTallyableDispute(dispute.numberOfChoices);

  //Get the vote tally for each round that can no longer receive votes.
  //A slow or failing call does not block the UI, it just doesn't show vote counts for that round.
  const voteCountersByRound = useCacheCall(["KlerosLiquid"], (call) =>
    dispute.votesLengths.map((_, i) =>
      isTallyable && isRoundTallyFinal(i, currentRound, period)
        ? call("KlerosLiquid", "getVoteCounter", ID, i)
        : undefined
    )
  );

  const selectedRoundVoteCounter = voteCountersByRound[round];

  //Note that this can be gated only on the round being finalized because we don't need to worry about calling getVoteCounter.
  const voteTurnoutSummary = isRoundTallyFinal(round, currentRound, period)
    ? getVoteTurnoutSummary(dispute.votesInEachRound[round], dispute.votesLengths[round])
    : null;

  const handleChangeRound = useCallback((e) => {
    setRound(e.target.value);
    setJustificationIndex(0);
  }, []);

  const handleChangeRulingOption = useCallback((e) => {
    setRulingOption(e.target.value);
    setJustificationIndex(0);
  }, []);

  return (
    <Skeleton active loading={isLoading}>
      {justificationsByRound && (
        <StyledCaseRoundHistory>
          <Row>
            <Col md={10}>
              <RoundSelectBox>
                <h3>Round</h3>
                <StyledRadioGroup buttonStyle="solid" name="round" onChange={handleChangeRound} value={round}>
                  <Row>
                    {dispute.votesLengths.map((_, i) => (
                      <Col lg={12} md={24} key={i}>
                        <Radio.Button key={i} value={i}>
                          Round {i + 1}
                        </Radio.Button>
                      </Col>
                    ))}
                  </Row>
                </StyledRadioGroup>
              </RoundSelectBox>
              <RulingOptionsBox>
                <h3>Votes</h3>
                {voteTurnoutSummary && <VoteTurnoutSummary>{voteTurnoutSummary}</VoteTurnoutSummary>}
                <StyledRadioGroup
                  buttonStyle="solid"
                  name="votes"
                  onChange={handleChangeRulingOption}
                  value={rulingOption}
                >
                  <Row>
                    <Col lg={24}>
                      <Radio.Button size="large" value={"0"}>
                        <VoteOptionLabel
                          title={RTA_LABEL}
                          voteCount={getChoiceVoteCount(selectedRoundVoteCounter, "0")}
                        />
                      </Radio.Button>
                    </Col>
                    {metaEvidence &&
                      metaEvidence.rulingOptions?.titles?.map((option, i) => {
                        const choiceKey = (i + 1).toString();
                        return (
                          <Col lg={24} key={i}>
                            <Radio.Button size="large" value={choiceKey}>
                              <VoteOptionLabel
                                title={option}
                                voteCount={getChoiceVoteCount(selectedRoundVoteCounter, choiceKey)}
                              />
                            </Radio.Button>
                          </Col>
                        );
                      })}
                    {metaEvidence.rulingOptions?.reserved &&
                      Object.keys(metaEvidence.rulingOptions.reserved).map((key) => {
                        const choiceKey = normalizeRulingValue(key);
                        return (
                          <Col lg={24} key={key}>
                            <Radio.Button size="large" value={choiceKey}>
                              <VoteOptionLabel
                                title={metaEvidence.rulingOptions.reserved[key]}
                                voteCount={getChoiceVoteCount(selectedRoundVoteCounter, choiceKey)}
                              />
                            </Radio.Button>
                          </Col>
                        );
                      })}
                  </Row>
                </StyledRadioGroup>
              </RulingOptionsBox>
            </Col>
            <Col md={14} style={{ height: "100%" }}>
              <JustificationsBox>
                <Skeleton active loading={!justificationsChoices[round]}>
                  <h2>Justification</h2>
                  {justificationsChoices[round] && justificationsChoices[round][rulingOption]?.length > 0 ? (
                    <>
                      <JustificationText>
                        {justificationsChoices[round][rulingOption][justificationIndex]}
                      </JustificationText>
                      <ScrollBarContainer>
                        <ScrollBar
                          currentOption={justificationIndex}
                          numberOfOptions={justificationsChoices[round][rulingOption]?.length - 1}
                          setOption={setJustificationIndex}
                        />
                      </ScrollBarContainer>
                    </>
                  ) : (
                    <div>No Justifications for this selection</div>
                  )}
                </Skeleton>
              </JustificationsBox>
            </Col>
          </Row>
        </StyledCaseRoundHistory>
      )}
    </Skeleton>
  );
}

CaseRoundHistory.propTypes = {
  ID: t.string.isRequired,
  dispute: t.object.isRequired,
  ruling: t.oneOfType([t.number, t.string]),
};

const StyledCaseRoundHistory = styled.div`
  height: 550px;

  @media (max-width: 768px) {
    height: auto;
  }

  .ant-row {
    height: 100%;
  }
`;

const StyledRadioGroup = styled(Radio.Group)`
  width: 100%;

  .ant-radio-button-wrapper {
    margin-bottom: 15px;
    text-align: center;
    width: 95%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const VoteOption = styled.span`
  align-items: baseline;
  display: inline-flex;
  max-width: 100%;
`;

const VoteOptionTitle = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const VoteOptionCount = styled.span`
  flex: 0 0 auto;
  padding-left: 6px;
`;

const VoteTurnoutSummary = styled.div`
  color: ${({ theme }) => theme.textSecondary};
  font-size: 12px;
  line-height: 14px;
  margin-bottom: 14px;
  text-align: center;
`;

const Box = styled.div`
  padding: 21px 43px;
`;

const RoundSelectBox = styled(Box)`
  border-bottom: 1px solid ${({ theme }) => theme.primaryPurple};

  h3 {
    color: ${({ theme }) => theme.textPrimary};
    font-size: 14px;
    font-weight: 500;
    line-height: 16px;
    margin-bottom: 14px;
    text-align: center;
  }
`;

const RulingOptionsBox = styled(Box)`
  h3 {
    color: ${({ theme }) => theme.textPrimary};
    font-size: 14px;
    font-weight: 500;
    line-height: 16px;
    margin-bottom: 14px;
    text-align: center;
  }
`;

const JustificationsBox = styled(Box)`
  border-left: 1px solid ${({ theme }) => theme.primaryPurple};
  height: 100%;
  text-align: center;
  color: ${({ theme }) => theme.textSecondary};
  @media (max-width: 768px) {
    border-left: none;
    border-top: 1px solid ${({ theme }) => theme.primaryPurple};
  }
  h2 {
    color: ${({ theme }) => theme.textPrimary};
    font-size: 24px;
    font-weight: 500;
    line-height: 28px;
    margin-bottom: 60px;
  }
`;

const ScrollBarContainer = styled.div`
  bottom: 40px;
  margin-left: -35px;
  position: absolute;
  width: 95%;

  @media (max-width: 768px) {
    bottom: none;
    margin-left: 0;
    position: unset;
  }
`;

const JustificationText = styled.div`
  max-height: 300px;
  overflow: auto;
  color: ${({ theme }) => theme.textSecondary};
`;
