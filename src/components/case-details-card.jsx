import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import styled from "styled-components/macro";
import { Alert, Button, Card, Checkbox, Col, DatePicker, Icon, Input, InputNumber, Row, Spin } from "antd";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import * as realitioLibQuestionFormatter from "@reality.eth/reality-eth-lib/formatters/question";
import ReactMarkdown from "react-markdown";
import createPersistedState from "use-persisted-state";
import Web3 from "web3";
import { ReactComponent as Document } from "../assets/images/document.svg";
import { ReactComponent as Folder } from "../assets/images/folder.svg";
import { ReactComponent as Gavel } from "../assets/images/gavel.svg";
import { ReactComponent as Scales } from "../assets/images/scales.svg";
import { postJustification } from "../bootstrap/api";
import { useDataloader, useEvidence, VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import web3Salt from "../temp/web3-salt";
import { range, binaryPermutations } from "../helpers/array";
import useChainId from "../hooks/use-chain-id";
import Attachment from "./attachment";
import DisputeTimeline from "./dispute-timeline";
import Breadcrumbs from "./breadcrumbs";
import CaseRoundHistory from "./case-round-history";
import CollapsableCard from "./collapsable-card";
import CourtDrawer from "./court-drawer";
import EvidenceTimeline from "./evidence-timeline";
import { getReadOnlyRpcUrl } from "../bootstrap/web3";
import useGetDraws from "../hooks/use-get-draws";
import arbitrableWhitelist from "../temp/arbitrable-whitelist";

const { useDrizzle, useDrizzleState } = drizzleReactHooks;
const { toBN, soliditySha3 } = Web3.utils;

const JustificationBox = ({ onChange, justification }) => {
  const placeholder = "Justify your vote here...";

  return <StyledInputTextArea onChange={onChange} placeholder={placeholder} value={justification} />;
};

const getVotingStatus = (disputePeriod, votesData, hiddenVotes) => {
  if (disputePeriod === "0") {
    return "Waiting for evidence.";
  } else if (disputePeriod === "1") {
    return !votesData.committed
      ? "You did not commit your vote yet."
      : "You committed your vote. You will be able to reveal your vote when the period ends.";
  } else if (hiddenVotes) {
    return votesData.committed
      ? "You did not reveal your vote yet."
      : "You did not commit a vote in the previous period. You cannot vote anymore.";
  } else {
    return "You did not cast a vote.";
  }
};

const VoteOptions = ({ metaEvidence, votesData, complexRuling, setComplexRuling, onVoteClick, disabledDate }) => {
  const isSingleSelect = metaEvidence.rulingOptions.type === "single-select";
  const isMultipleSelect = metaEvidence.rulingOptions.type === "multiple-select";
  const isDateTime = metaEvidence.rulingOptions.type === "datetime";

  let inputComponent;

  if (isMultipleSelect) {
    inputComponent = (
      <div style={{ paddingTop: "1rem" }}>
        <Checkbox.Group
          disabled={!votesData.canVote}
          name="ruling"
          onChange={setComplexRuling}
          options={metaEvidence.rulingOptions.titles?.slice(0, 255)}
          value={complexRuling}
        />
      </div>
    );
  } else if (isDateTime) {
    inputComponent = (
      <DatePicker
        disabled={!votesData.canVote}
        disabledDate={disabledDate}
        onChange={setComplexRuling}
        size="large"
        showTime
        value={complexRuling}
      />
    );
  } else if (isSingleSelect) {
    inputComponent = metaEvidence.rulingOptions.titles?.slice(0, 2 ** 256 - 1).map((title, index) => (
      <StyledButton
        disabled={!votesData.canVote}
        id={index + 1}
        key={title}
        onClick={onVoteClick}
        size="large"
        type="primary"
      >
        {title}
      </StyledButton>
    ));
  } else {
    inputComponent = (
      <InputNumber
        disabled={!votesData.canVote}
        max={Number(
          realitioLibQuestionFormatter
            .maxNumber({
              decimals: metaEvidence.rulingOptions.precision,
              type: metaEvidence.rulingOptions.type,
            })
            .minus(1)
        )}
        min={Number(
          realitioLibQuestionFormatter.minNumber({
            decimals: metaEvidence.rulingOptions.precision,
            type: metaEvidence.rulingOptions.type,
          })
        )}
        onChange={setComplexRuling}
        precision={metaEvidence.rulingOptions.precision}
        size="large"
        value={complexRuling}
      />
    );
  }

  return (
    <StyledButtonsDiv>
      {inputComponent}
      {isSingleSelect ? null : (
        <StyledButton disabled={!votesData.canVote || !complexRuling} onClick={onVoteClick} size="large" type="primary">
          Submit
        </StyledButton>
      )}
    </StyledButtonsDiv>
  );
};

const RevealVoteButton = ({ onRevealClick, votesData, dispute }) => {
  return (
    <StyledButtonsDiv>
      <StyledButton
        onClick={onRevealClick}
        size="large"
        type="primary"
        disabled={!votesData.canVote || dispute.period !== "2"}
      >
        Reveal Vote
      </StyledButton>
    </StyledButtonsDiv>
  );
};

export default function CaseDetailsCard({ ID }) {
  const { drizzle, useCacheCall, useCacheSend } = useDrizzle();
  const drizzleState = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
  }));
  const { account } = drizzleState;
  const { web3 } = drizzle;
  const { KlerosLiquid } = drizzle.contracts;

  const loadPolicy = useDataloader.loadPolicy();
  const getMetaEvidence = useDataloader.getMetaEvidence();
  const [activeSubcourtID, setActiveSubcourtID] = useState();
  const [justification, setJustification] = useState();
  const [complexRuling, setComplexRuling] = useState();
  const dispute = useCacheCall("KlerosLiquid", "disputes", ID);
  const disputeExtraInfo = useCacheCall("KlerosLiquid", "getDispute", ID);
  const chainId = useChainId();
  const draws = useGetDraws(chainId, `address: "${drizzleState.account}", disputeID: ${ID}`);
  const votesData = useCacheCall(["KlerosLiquid"], (call) => {
    let votesData = { loading: true };
    const currentRuling = call("KlerosLiquid", "currentRuling", ID);
    if (dispute && disputeExtraInfo && draws) {
      const drawnInCurrentRound =
        draws.length > 0 && Number(draws[draws.length - 1].appeal) === disputeExtraInfo.votesLengths.length - 1;
      const vote =
        drawnInCurrentRound &&
        call("KlerosLiquid", "getVote", ID, draws[draws.length - 1].appeal, draws[draws.length - 1].voteID);
      const subcourt = drawnInCurrentRound && call("KlerosLiquid", "courts", dispute.subcourtID);
      if (!drawnInCurrentRound || (vote && subcourt)) {
        const committed =
          drawnInCurrentRound && vote.commit !== "0x0000000000000000000000000000000000000000000000000000000000000000";
        votesData = draws.reduce(
          (acc, d) => {
            if (Number(d.appeal) === disputeExtraInfo.votesLengths.length - 1) acc.voteIDs.push(d.voteID);
            return acc;
          },
          {
            canVote:
              drawnInCurrentRound &&
              ((dispute.period === "1" && !committed) ||
                (dispute.period === "2" && (!subcourt.hiddenVotes || committed) && !vote.voted)),
            committed,
            commit: vote.commit,
            currentRuling,
            drawnInCurrentRound,
            loading: !currentRuling,
            voteIDs: [],
            voted: vote.voted && vote.choice,
          }
        );
      }
    }
    return votesData;
  });
  const subcourts = useCacheCall(["PolicyRegistry", "KlerosLiquid"], (call) => {
    if (dispute) {
      const subcourts = [];
      let nextID = dispute.subcourtID;
      while (!subcourts.length || subcourts[subcourts.length - 1].ID !== nextID) {
        const subcourt = {
          ID: nextID,
          hiddenVotes: undefined,
          name: undefined,
        };
        const policy = call("PolicyRegistry", "policies", subcourt.ID);
        if (policy !== undefined) {
          const policyJSON = loadPolicy(policy);
          if (policyJSON) subcourt.name = policyJSON.name;
        }
        const _subcourt = call("KlerosLiquid", "courts", subcourt.ID);
        if (_subcourt) {
          nextID = _subcourt.parent;
          subcourt.hiddenVotes = _subcourt.hiddenVotes;
        }
        if (subcourt.name === undefined || !_subcourt) return undefined;
        subcourts.push(subcourt);
      }
      return subcourts.reverse();
    }
  });

  //Added for DisputeTimeline
  const subcourtObj = useCacheCall(["KlerosLiquid"], (call) => {
    if (dispute) {
      const subcourt = call("KlerosLiquid", "courts", dispute.subcourtID);
      const subcourtObj = call("KlerosLiquid", "getSubcourt", dispute.subcourtID);
      return { ...subcourt, ...subcourtObj };
    }
  });

  const metaEvidence = dispute && getMetaEvidence(chainId, dispute.arbitrated, KlerosLiquid.address, ID);
  const evidence = useEvidence(chainId, ID);

  const { send: sendCommit, status: sendCommitStatus } = useCacheSend("KlerosLiquid", "castCommit");
  const { send: sendVote, status: sendVoteStatus } = useCacheSend("KlerosLiquid", "castVote");
  const onJustificationChange = useCallback(({ currentTarget: { value } }) => setJustification(value), []);
  const disabledDate = useCallback(
    (date) =>
      realitioLibQuestionFormatter
        .maxNumber({
          decimals: metaEvidence.rulingOptions.precision,
          type: metaEvidence.rulingOptions.type,
        })
        .lte(date.unix() + 1),
    [metaEvidence]
  );

  const useStoredCommittedVote = useMemo(() => createPersistedState(`@kleros/court/${account}/${ID}/vote`), [
    ID,
    account,
  ]);
  const [committedVote, setCommittedVote] = useStoredCommittedVote();

  useEffect(() => {
    if (dispute?.arbitrated && !arbitrableWhitelist[chainId]?.includes(dispute?.arbitrated.toLowerCase()))
      console.warn("Arbitrable not included in whitelist for evidence display");
  }, [dispute?.arbitrated, chainId]);

  useEffect(() => {
    let mounted = true;

    async function deriveCommitedVote() {
      const { rulingOptions } = metaEvidence;
      const salt = await web3Salt(web3, account, VOTE_COMMIT_SALT_KEY, ID, disputeExtraInfo.votesLengths.length - 1);
      return deriveVoteFromCommitThroughBruteForce({
        salt,
        rulingOptions,
        commit: votesData.commit,
      });
    }

    if (votesData.committed && !votesData.voted && !committedVote && metaEvidence?.rulingOptions) {
      deriveCommitedVote().then(
        (result) => {
          if (mounted && result !== undefined) {
            setCommittedVote(result);
          }
        },
        (err) => {
          console.warn("Error while trying to derive the commited vote", err);
        }
      );
    }

    return () => {
      mounted = false;
    };
  }, [votesData, committedVote, metaEvidence, web3, account, ID, disputeExtraInfo, setCommittedVote]);

  const sendOrRevealVote = useCallback(
    async (choice) => {
      if (justification && justification.trim().length > 0)
        await postJustification({
          account,
          web3,
          justification: {
            appeal: disputeExtraInfo.votesLengths.length - 1,
            disputeID: ID,
            justification,
            voteIDs: votesData.voteIDs,
          },
        });

      sendVote(
        ID,
        votesData.voteIDs,
        choice,
        subcourts[subcourts.length - 1].hiddenVotes
          ? await web3Salt(web3, account, VOTE_COMMIT_SALT_KEY, ID, disputeExtraInfo.votesLengths.length - 1)
          : 0
      );
    },
    [disputeExtraInfo, votesData, web3, account, subcourts, ID, justification, sendVote]
  );

  const onRevealClick = useCallback(() => {
    sendOrRevealVote(committedVote);
  }, [committedVote, sendOrRevealVote]);

  const onVoteClick = useCallback(
    async ({ currentTarget: { id } }) => {
      let choice;
      const typeSwitch =
        id !== "0" &&
        !Object.keys(metaEvidence.rulingOptions?.reserved ?? {}).includes(id) &&
        metaEvidence.rulingOptions?.type;

      switch (typeSwitch) {
        case "multiple-select":
          choice = metaEvidence.rulingOptions.titles
            ? metaEvidence.rulingOptions.titles.map((t) => complexRuling.includes(t))
            : [];
          break;
        case "datetime":
          choice = complexRuling.utcOffset(0).unix();
          break;
        case "uint":
          choice = complexRuling;
          break;
        default:
          choice = id;
          break;
      }
      switch (typeSwitch) {
        case "multiple-select":
        case "datetime":
        case "uint":
          choice = realitioLibQuestionFormatter.answerToBytes32(choice, {
            decimals: metaEvidence.rulingOptions.precision,
            type: metaEvidence.rulingOptions.type,
          });
          choice = realitioLibQuestionFormatter.padToBytes32(toBN(choice).add(toBN("1")).toString(16));
          break;
        default:
          break;
      }

      if (dispute.period === "1") {
        sendCommit(
          ID,
          votesData.voteIDs,
          soliditySha3(
            choice,
            await web3Salt(web3, account, VOTE_COMMIT_SALT_KEY, ID, disputeExtraInfo.votesLengths.length - 1)
          )
        );
        setCommittedVote(choice);
      } else {
        sendOrRevealVote(choice);
      }
    },
    [
      setCommittedVote,
      sendCommit,
      metaEvidence,
      complexRuling,
      dispute,
      ID,
      votesData.voteIDs,
      web3,
      account,
      disputeExtraInfo,
      sendOrRevealVote,
    ]
  );
  const metaEvidenceActions = useMemo(() => {
    if (metaEvidence) {
      const actions = [];
      if (metaEvidence.fileURI)
        actions.push(
          <Attachment
            URI={metaEvidence.fileURI}
            description="This is the primary file uploaded with the dispute."
            extension={metaEvidence.fileTypeExtension}
            title="Main File"
          />
        );
      actions.push(
        <StyledInnerCardActionsTitleDiv className="ternary-color theme-color">
          Primary Documents
        </StyledInnerCardActionsTitleDiv>
      );
      return actions;
    }
  }, [metaEvidence]);

  const evidenceDisplayInterfaceURL = useMemo(() => {
    const normalizeIPFSUri = (uri) => uri.replace(/^\/ipfs\//, "https://ipfs.kleros.io/ipfs/");
    if (metaEvidence?.evidenceDisplayInterfaceURI) {
      // hack to allow displaying old t2cr disputes, since old endpoint was lost
      const evidenceDisplayInterfaceURI =
        dispute?.arbitrated === "0xEbcf3bcA271B26ae4B162Ba560e243055Af0E679"
          ? "/ipfs/QmYs17mAJTaQwYeXNTb6n4idoQXmRcAjREeUdjJShNSeKh/index.html"
          : metaEvidence.evidenceDisplayInterfaceURI;

      const { _v = "0" } = metaEvidence;

      const arbitratorChainID = metaEvidence?.arbitratorChainID ?? chainId;
      const arbitrableChainID = metaEvidence?.arbitrableChainID ?? arbitratorChainID;

      let url = normalizeIPFSUri(evidenceDisplayInterfaceURI);

      const injectedParams = {
        disputeID: ID,
        chainID: chainId, // Deprecated. Use arbitratorChainID and arbitrableChainID instead.
        arbitratorContractAddress: KlerosLiquid.address,
        arbitratorJsonRpcUrl: getReadOnlyRpcUrl(arbitratorChainID),
        arbitratorChainID,
        arbitrableContractAddress: dispute.arbitrated,
        arbitrableChainID,
        arbitrableJsonRpcUrl: getReadOnlyRpcUrl(arbitrableChainID),
      };

      if (_v === "0") {
        url += `?${encodeURIComponent(JSON.stringify(injectedParams))}`;
      } else {
        const searchParams = new URLSearchParams(injectedParams);
        url += `?${searchParams.toString()}`;
      }

      return url;
    }
  }, [metaEvidence, ID, dispute, chainId, KlerosLiquid.address]);

  return (
    <>
      <StyledCard
        actions={[
          <Spin
            key="main"
            spinning={
              votesData.loading ||
              !subcourts ||
              !metaEvidence ||
              sendCommitStatus === "pending" ||
              sendVoteStatus === "pending"
            }
          >
            {!votesData.loading && subcourts && metaEvidence ? (
              <>
                <StyledActionsDiv className="secondary-linear-background theme-linear-background">
                  {dispute.period !== "2" ? <GavelLarge /> : ""}
                  {votesData.drawnInCurrentRound ? (
                    <>
                      <div style={{ marginBottom: "20px" }}>
                        {metaEvidence.question ? metaEvidence.question : "What is your decision?"}
                      </div>
                      {votesData.voted ? (
                        <>
                          <div>
                            You voted for: &ldquo;
                            {votesData.voted === "0"
                              ? "Refuse to Arbitrate"
                              : (metaEvidence.rulingOptions &&
                                  realitioLibQuestionFormatter.getAnswerString(
                                    {
                                      decimals: metaEvidence.rulingOptions.precision,
                                      outcomes: metaEvidence.rulingOptions.titles,
                                      type: metaEvidence.rulingOptions.type,
                                    },
                                    realitioLibQuestionFormatter.padToBytes32(
                                      toBN(votesData.voted).sub(toBN("1")).toString(16)
                                    )
                                  )) ||
                                "Unknown Choice"}
                            &rdquo;.
                          </div>
                          {Number(dispute.period) < 4 ? (
                            <SecondaryActionText>Waiting for the vote result.</SecondaryActionText>
                          ) : null}
                        </>
                      ) : (
                        getVotingStatus(dispute.period, votesData, subcourts[subcourts.length - 1].hiddenVotes)
                      )}
                    </>
                  ) : (
                    "You were not drawn in the current round."
                  )}
                  {dispute.period === "4" && (
                    <SecondaryActionText>
                      The winner in this case was: &ldquo;
                      {votesData.currentRuling === "0"
                        ? "Refuse to Arbitrate"
                        : (metaEvidence.rulingOptions &&
                            realitioLibQuestionFormatter.getAnswerString(
                              {
                                decimals: metaEvidence.rulingOptions.precision,
                                outcomes: metaEvidence.rulingOptions.titles,
                                type: metaEvidence.rulingOptions.type,
                              },
                              realitioLibQuestionFormatter.padToBytes32(
                                toBN(votesData.currentRuling).sub(toBN("1")).toString(16)
                              )
                            )) ||
                          "Unknown Choice"}
                      &rdquo;.
                    </SecondaryActionText>
                  )}
                  {votesData.committed && !votesData.voted ? (
                    committedVote !== undefined ? (
                      <SecondaryActionText>
                        You committed to:{" "}
                        {votesData.voted === "0"
                          ? "Refuse to Arbitrate"
                          : (metaEvidence.rulingOptions &&
                              realitioLibQuestionFormatter.getAnswerString(
                                {
                                  decimals: metaEvidence.rulingOptions.precision,
                                  outcomes: metaEvidence.rulingOptions.titles,
                                  type: metaEvidence.rulingOptions.type,
                                },
                                realitioLibQuestionFormatter.padToBytes32(
                                  toBN(committedVote).sub(toBN("1")).toString(16)
                                )
                              )) ||
                            "Unknown Choice"}
                        .
                      </SecondaryActionText>
                    ) : (
                      <Alert
                        showIcon
                        type="warning"
                        message="Could not find your committed vote"
                        description="You probably committed to your vote from another device. You will need to manually select the voted option(s) and submit it."
                        css={`
                          text-align: left;
                          margin-top: 2rem;
                        `}
                      />
                    )
                  ) : null}
                  {votesData.canVote && dispute.period === "2" && (
                    <JustificationBox onChange={onJustificationChange} justification={justification} />
                  )}
                  {Number(dispute.period) < 3 && !votesData.voted && metaEvidence.rulingOptions ? (
                    votesData.committed && committedVote !== undefined ? (
                      <RevealVoteButton onRevealClick={onRevealClick} votesData={votesData} dispute={dispute} />
                    ) : (
                      <VoteOptions
                        metaEvidence={metaEvidence}
                        votesData={votesData}
                        complexRuling={complexRuling}
                        setComplexRuling={setComplexRuling}
                        onVoteClick={onVoteClick}
                        disabledDate={disabledDate}
                      />
                    )
                  ) : null}
                </StyledActionsDiv>
                <StyledDiv className="secondary-background theme-background" style={{ display: "inherit" }}>
                  <div>
                    {Number(dispute.period) < "3" && !votesData.voted ? (
                      <Button
                        disabled={!votesData.canVote}
                        ghost={votesData.canVote}
                        id={0}
                        onClick={onVoteClick}
                        size="large"
                      >
                        Refuse to Arbitrate
                      </Button>
                    ) : null}
                  </div>

                  {Object.entries(metaEvidence.rulingOptions?.reserved ?? {}).map(([ruling, title]) => (
                    <div key={ruling} style={{ marginTop: "32px" }}>
                      {Number(dispute.period) < "3" && !votesData.voted ? (
                        <Button
                          disabled={!votesData.canVote}
                          ghost={votesData.canVote}
                          id={ruling}
                          onClick={onVoteClick}
                          size="large"
                        >
                          {title}
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </StyledDiv>
              </>
            ) : (
              <StyledDiv className="secondary-linear-background theme-linear-background" />
            )}
          </Spin>,
        ]}
        extra={
          <StyledPoliciesButton
            onClick={useCallback(() => dispute && setActiveSubcourtID(dispute.subcourtID), [dispute])}
          >
            <StyledDocument /> Policies
          </StyledPoliciesButton>
        }
        loading={!metaEvidence}
        title={
          <>
            {metaEvidence?.title}
            {subcourts && <StyledBreadcrumbs breadcrumbs={subcourts.map((s) => s.name)} />}
          </>
        }
      >
        {metaEvidence && (
          <>
            <Row>
              <Col span={24}>
                <StyledInnerCard actions={metaEvidenceActions}>
                  <ReactMarkdown source={metaEvidence.description} />
                  {metaEvidence.evidenceDisplayInterfaceURI && (
                    <iframe
                      sandbox={
                        arbitrableWhitelist[chainId]?.includes(dispute.arbitrated.toLowerCase())
                          ? "allow-scripts allow-same-origin"
                          : "allow-scripts"
                      }
                      title="dispute details"
                      style={{ width: "1px", minWidth: "100%", height: "360px", border: "none" }}
                      src={evidenceDisplayInterfaceURL}
                    />
                  )}
                  {metaEvidence.arbitrableInterfaceURI && (
                    <ArbitrableInterfaceDiv>
                      <a href={metaEvidence.arbitrableInterfaceURI} target="_blank" rel="noopener noreferrer">
                        <Icon type="double-right" style={{ marginRight: "5px" }} />
                        Go to the Arbitrable Application
                      </a>
                    </ArbitrableInterfaceDiv>
                  )}
                  {ID === "302" ? (
                    <ArbitrableInterfaceDiv>
                      This realitio dispute has been created by Omen, we advise you to read the{" "}
                      <a target="_blank" rel="noopener noreferrer" href={"https://omen.eth.limo/rules.pdf"}>
                        Omen Rules
                      </a>{" "}
                      and consult the evidence provided in the{" "}
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        href={"https://omen.eth.limo/#/0xffbc624070cb014420a6f7547fd05dfe635e2db2"}
                      >
                        Market Comments.
                      </a>
                    </ArbitrableInterfaceDiv>
                  ) : null}
                  {ID === "532" ? (
                    <ArbitrableInterfaceDiv>
                      This realitio dispute has been created by Omen, we advise you to read the{" "}
                      <a target="_blank" rel="noopener noreferrer" href={"https://omen.eth.limo/rules.pdf"}>
                        Omen Rules
                      </a>{" "}
                      and consult the evidence provided in the{" "}
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        href={"https://omen.eth.limo/#/0x95b2271039b020aba31b933039e042b60b063800"}
                      >
                        Market Comments.
                      </a>
                    </ArbitrableInterfaceDiv>
                  ) : null}
                </StyledInnerCard>
              </Col>
            </Row>
            <div style={{ marginBottom: "2rem" }}>
              <DisputeTimeline
                period={Number(dispute.period)}
                lastPeriodChange={dispute.lastPeriodChange}
                subcourt={subcourtObj}
              />
            </div>
            <CollapsableCard
              title={
                <>
                  <Folder /> Evidence
                  <strong> {`(${evidence ? evidence.length : 0})`}</strong>
                </>
              }
            >
              <EvidenceTimeline
                evidence={evidence}
                metaEvidence={metaEvidence}
                ruling={dispute.period === "4" ? votesData.currentRuling : null}
                chainId={chainId}
              />
            </CollapsableCard>
            {disputeExtraInfo &&
              metaEvidence &&
              metaEvidence.rulingOptions &&
              metaEvidence.rulingOptions.type === "single-select" && (
                <CollapsableCard
                  title={
                    <>
                      <Scales /> Dispute History
                      <strong> {`(Current Round: ${disputeExtraInfo?.votesLengths?.length})`}</strong>
                    </>
                  }
                >
                  <CaseRoundHistory
                    ID={ID}
                    dispute={{
                      ...disputeExtraInfo,
                      ...dispute,
                    }}
                    ruling={dispute.period === "4" ? votesData.currentRuling : null}
                  />
                </CollapsableCard>
              )}
          </>
        )}
        {activeSubcourtID !== undefined && <CourtDrawer ID={activeSubcourtID} onClose={setActiveSubcourtID} />}
      </StyledCard>

      {dispute && !votesData.loading && metaEvidence && (
        <div key={0} style={{ marginTop: "32px" }}>
          {votesData.voted && (
            <div>
              You successfully voted for{" "}
              {votesData.voted === "0"
                ? "Refuse to Arbitrate"
                : (metaEvidence.rulingOptions &&
                    realitioLibQuestionFormatter.getAnswerString(
                      {
                        decimals: metaEvidence.rulingOptions.precision,
                        outcomes: metaEvidence.rulingOptions.titles,
                        type: metaEvidence.rulingOptions.type,
                      },
                      realitioLibQuestionFormatter.padToBytes32(toBN(votesData.voted).sub(toBN("1")).toString(16))
                    )) ||
                  "Unknown Choice"}
              .
            </div>
          )}
          {Number(dispute.period) < "3" && !votesData.voted && (
            <>
              <div>
                If the dispute is failing to load and appears to be broken it is advised to refuse to arbitrate. Please
                cast your vote using button below.
              </div>
              <Button
                style={{ color: "#4d00b4", marginTop: "16px", float: "right" }}
                disabled={!votesData.canVote}
                ghost={!votesData.canVote}
                id={0}
                onClick={onVoteClick}
                size="large"
              >
                {"Refuse to Arbitrate"}
              </Button>
            </>
          )}
        </div>
      )}
    </>
  );
}

CaseDetailsCard.propTypes = {
  ID: PropTypes.string.isRequired,
};

VoteOptions.propTypes = {
  disabledDate: PropTypes.func,
  metaEvidence: PropTypes.object,
  votesData: PropTypes.object,
  onVoteClick: PropTypes.func,
  setComplexRuling: PropTypes.func,
  complexRuling: PropTypes.any,
};

RevealVoteButton.propTypes = {
  dispute: PropTypes.object,
  onRevealClick: PropTypes.func,
  votesData: PropTypes.object,
};

JustificationBox.propTypes = {
  onChange: PropTypes.func,
  justification: PropTypes.string,
};

realitioLibQuestionFormatter.minNumber = realitioLibQuestionFormatter.minNumber.bind({
  maxNumber: (...args) => {
    const result = realitioLibQuestionFormatter.maxNumber(...args);
    result.neg = result.negated;
    return result;
  },
});

/**
 * This function will try to derive the original vote made by a juror by generating every
 * possible vote and combining them with the salt to compare against the on-chain commit.
 *
 * It works only for cases whose ruling type is one of [`single-select`, `multiple-select`].
 *
 * Asymptotic complexity:
 * - `single-select`: `O(n)`
 * - `multiple-select`: `O(2^n)`
 *
 * @param {object} args
 * @param {string} args.commit The commit stored on-chain.
 * @param {string} args.salt The salt for the commit.
 * @param {object} args.rulingOptions The ruling options metadata.
 * @return {string|undefined} The derived vote, if any.
 */
const deriveVoteFromCommitThroughBruteForce = async ({ commit, salt, rulingOptions }) => {
  const numberOfOptions = rulingOptions.titles.length;

  if (rulingOptions.type === "single-select") {
    const committedVote = range(numberOfOptions + 1).find((choice) => soliditySha3(choice, salt) === commit);
    return committedVote && String(committedVote);
  }

  if (rulingOptions.type === "multiple-select") {
    const permutations = binaryPermutations(numberOfOptions);

    let encodedCommittedVote;

    permutations.find((choice) => {
      let encodedAnswer = realitioLibQuestionFormatter.answerToBytes32(choice, {
        decimals: rulingOptions.precision,
        type: rulingOptions.type,
      });
      encodedAnswer = realitioLibQuestionFormatter.padToBytes32(toBN(encodedAnswer).add(toBN("1")).toString(16));

      if (soliditySha3(encodedAnswer, salt) !== commit) {
        return false;
      }

      encodedCommittedVote = encodedAnswer;
      return true;
    });

    return encodedCommittedVote;
  }

  return undefined;
};

const VOTE_COMMIT_SALT_KEY =
  "Please sign this message to secure your vote. This is unrelated from your main Ethereum account and will not be able to send any transactions.";

const StyledCard = styled(Card)`
  border-radius: 12px;
  box-shadow: 0px 6px 36px #bc9cff;
  cursor: initial;

  .ant-card {
    &-head {
      margin: 0 46px;
      padding: 0;
      position: relative;

      @media (max-width: 767px) {
        margin: 0 23px;
      }

      &-title {
        color: #4d00b4;
        font-size: 24px;
      }
    }

    &-body {
      padding: 44px 46px 23px;

      @media (max-width: 767px) {
        padding: 44px 23px 23px;
      }
    }

    &-actions {
      border: none;

      & > li {
        margin: 0;

        & > span {
          cursor: initial;
          display: block;
        }
      }
    }
  }
`;

const StyledDiv = styled.div`
  align-items: center;
  color: white;
  display: flex;
  flex-direction: column;
  font-size: 24px;
  padding: 34px 10px;
`;

const StyledActionsDiv = styled(StyledDiv)`
  min-height: 250px;
  overflow: hidden;
`;

const SecondaryActionText = styled.div`
  margin-top: 30px;
`;

const StyledInputTextArea = styled(Input.TextArea)`
  background: rgba(255, 255, 255, 0.3);
  border: none;
  color: white;
  height: 91px !important;
  margin: 24px 0;
  width: 70%;
`;

const StyledButtonsDiv = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  width: 70%;

  &:first-child {
    margin-top: 20px;
  }

  .ant-checkbox-group-item.ant-checkbox-wrapper span {
    color: white;
  }
`;

const StyledButton = styled(Button)`
  flex: 0 0 35%;
  margin: 20px 5px 15px;
`;

const StyledPoliciesButton = styled(Button)`
  border: 1px solid #4d00b4;
  border-radius: 3px;
  box-sizing: border-box;
  color: #4d00b4;
  padding-left: 40px;
  position: relative;
`;

const GavelLarge = styled(Gavel)`
  height: 150px;
  opacity: 0.15;
  position: absolute;
  top: 50px;
  width: 150px;
`;

const StyledDocument = styled(Document)`
  height: 18px;
  left: 17px;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: auto;
  path {
    fill: #4d00b4;
  }
`;

const StyledBreadcrumbs = styled(Breadcrumbs)`
  bottom: -20px;
  font-size: 10px;
  left: 0;
  position: absolute;
`;

const StyledInnerCard = styled(Card)`
  border: 1px solid #d09cff;
  border-radius: 3px;
  box-sizing: border-box;
  cursor: initial;
  margin-bottom: 38px;

  &.ant-card {
    .ant-card-head {
      margin: 0 21px 0 17px;
      padding: 0;

      &-title {
        align-items: center;
        display: flex;
        font-size: 18px;
      }
    }

    .ant-card-body {
      padding: 21px 20px 42px;
    }

    .ant-card-actions {
      background: linear-gradient(204.14deg, #ffffff -6.48%, #f5f1fd 45.52%);
      border: none;
      height: 70px;
      position: relative;
      text-align: center;

      & > li {
        border: none;
        margin: 12px 0;
        width: auto !important;

        path {
          fill: #4d00b4;
        }

        &:first-child {
          margin-left: 0;
          margin-right: 0;
          position: absolute;
          top: 4px;
          left: 50%;
          transform: translateX(-50%);
        }

        &:last-child {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
        }

        /* stylelint-disable-next-line no-descending-specificity */
        & > span {
          display: inline-block;
        }
      }
    }
  }
`;

const StyledInnerCardActionsTitleDiv = styled.div`
  position: absolute;
  top: -55px;
  left: 50%;
  transform: translateX(-50%);
  width: 168px;
  height: 28px;
  line-height: 28px;
  background: linear-gradient(204.14deg, #ffffff -6.48%, #f5f1fd 45.52%);
  border-radius: 6px 6px 0 0;
  text-align: center;
`;

const ArbitrableInterfaceDiv = styled.div`
  border-top: 1px solid #d09cff;
  font-size: 18px;
  padding: 20px 0px 5px 0px;

  a {
    color: #4d00b4;
  }
`;
