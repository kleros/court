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
import { API } from "../bootstrap/api";
import { useDataloader, VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
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

const { useDrizzle, useDrizzleState } = drizzleReactHooks;
const { toBN, soliditySha3 } = Web3.utils;

const JustificationBox = ({ web3, account, onChange, justification }) => {
  const key =
    "To keep your data safe and to use certain features of Kleros, we ask that you sign these messages to create a secret key for your account. This key is unrelated from your main Ethereum account and will not be able to send any transactions.";

  const storageKey = `${account}-${key}`;
  const secretSigningKey = localStorage.getItem(storageKey);
  const placeholder = secretSigningKey
    ? "Justify your vote here..."
    : "You need a signing key to provide a justification. You can get your signing key by setting your Notifications Settings above, or by clicking the button below. Then reload the page.";

  const makeAndStoreSigningKey = async () => {
    const signingKey = await web3.eth.personal.sign(key, account);
    localStorage.setItem(storageKey, signingKey);
  };

  return (
    <>
      <StyledInputTextArea
        onChange={onChange}
        placeholder={placeholder}
        value={justification}
        disabled={secretSigningKey === null}
      />
      {secretSigningKey === null && (
        <StyledButtonsDiv>
          <StyledButton onClick={makeAndStoreSigningKey} size="default" type="primary">
            Create signing key
          </StyledButton>
        </StyledButtonsDiv>
      )}
    </>
  );
};

export default function CaseDetailsCard({ ID }) {
  const { drizzle, useCacheCall, useCacheEvents, useCacheSend } = useDrizzle();
  const drizzleState = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
  }));
  const { account } = drizzleState;
  const { web3 } = drizzle;
  const { KlerosLiquid } = drizzle.contracts;

  const loadPolicy = useDataloader.loadPolicy();
  const getMetaEvidence = useDataloader.getMetaEvidence();
  const getEvidence = useDataloader.getEvidence();
  const [activeSubcourtID, setActiveSubcourtID] = useState();
  const [justification, setJustification] = useState();
  const [complexRuling, setComplexRuling] = useState();
  const dispute = useCacheCall("KlerosLiquid", "disputes", ID);
  const disputeExtraInfo = useCacheCall("KlerosLiquid", "getDispute", ID);
  const draws = useCacheEvents(
    "KlerosLiquid",
    "Draw",
    useMemo(
      () => ({
        filter: { _address: drizzleState.account, _disputeID: ID },
        fromBlock: process.env.REACT_APP_KLEROS_LIQUID_BLOCK_NUMBER,
      }),
      [drizzleState.account, ID]
    )
  );
  const votesData = useCacheCall(["KlerosLiquid"], (call) => {
    let votesData = { loading: true };
    const currentRuling = call("KlerosLiquid", "currentRuling", ID);
    if (dispute && disputeExtraInfo && draws) {
      const drawnInCurrentRound =
        draws.length > 0 &&
        Number(draws[draws.length - 1].returnValues._appeal) === disputeExtraInfo.votesLengths.length - 1;
      const vote =
        drawnInCurrentRound &&
        call(
          "KlerosLiquid",
          "getVote",
          ID,
          draws[draws.length - 1].returnValues._appeal,
          draws[draws.length - 1].returnValues._voteID
        );
      const subcourt = drawnInCurrentRound && call("KlerosLiquid", "courts", dispute.subcourtID);
      if (!drawnInCurrentRound || (vote && subcourt)) {
        const committed =
          drawnInCurrentRound && vote.commit !== "0x0000000000000000000000000000000000000000000000000000000000000000";
        votesData = draws.reduce(
          (acc, d) => {
            if (Number(d.returnValues._appeal) === disputeExtraInfo.votesLengths.length - 1)
              acc.voteIDs.push(d.returnValues._voteID);
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
      const subcourtObj = call("KlerosLiquid", "getSubcourt", dispute.subcourtID);
      return subcourtObj;
    }
  });
  let metaEvidence;
  let evidence;

  const chainId = useChainId();

  if (dispute) {
    if (dispute.ruled) {
      metaEvidence = getMetaEvidence(chainId, dispute.arbitrated, KlerosLiquid.address, ID, {
        strict: false,
      });
    } else {
      metaEvidence = getMetaEvidence(chainId, dispute.arbitrated, KlerosLiquid.address, ID);
    }

    evidence = getEvidence(dispute.arbitrated, KlerosLiquid.address, ID);
  }

  const { send: sendCommit, status: sendCommitStatus } = useCacheSend("KlerosLiquid", "castCommit");
  const { send: sendVote, status: sendVoteStatus } = useCacheSend("KlerosLiquid", "castVote");
  const onJustificationChange = useCallback(({ currentTarget: { value } }) => setJustification(value), []);
  const disabledDate = useCallback(
    (date) =>
      realitioLibQuestionFormatter
        .maxNumber({
          decimals: metaEvidence.metaEvidenceJSON.rulingOptions.precision,
          type: metaEvidence.metaEvidenceJSON.rulingOptions.type,
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
    let mounted = true;

    async function deriveCommitedVote() {
      const { rulingOptions } = metaEvidence.metaEvidenceJSON;
      const salt = await web3Salt(web3, account, VOTE_COMMIT_SALT_KEY, ID, disputeExtraInfo.votesLengths.length - 1);
      return deriveVoteFromCommitThroughBruteForce({
        salt,
        rulingOptions,
        commit: votesData.commit,
      });
    }

    if (votesData.committed && !votesData.voted && !committedVote && metaEvidence?.metaEvidenceJSON?.rulingOptions) {
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
      if (justification && justification.trim().length > 0) {
        API.putJustifications(web3, account, {
          appeal: disputeExtraInfo.votesLengths.length - 1,
          disputeID: ID,
          justification,
          voteIDs: votesData.voteIDs,
        });
      }

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
        !Object.keys(
          metaEvidence.metaEvidenceJSON.rulingOptions && metaEvidence.metaEvidenceJSON.rulingOptions.reserved
            ? metaEvidence.metaEvidenceJSON.rulingOptions.reserved
            : {}
        ).includes(id) &&
        metaEvidence.metaEvidenceJSON.rulingOptions &&
        metaEvidence.metaEvidenceJSON.rulingOptions.type;
      switch (typeSwitch) {
        case "multiple-select":
          choice = metaEvidence.metaEvidenceJSON.rulingOptions.titles
            ? metaEvidence.metaEvidenceJSON.rulingOptions.titles.map((t) => complexRuling.includes(t))
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
            decimals: metaEvidence.metaEvidenceJSON.rulingOptions.precision,
            type: metaEvidence.metaEvidenceJSON.rulingOptions.type,
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
      if (metaEvidence.metaEvidenceJSON.fileURI)
        actions.push(
          <Attachment
            URI={metaEvidence.metaEvidenceJSON.fileURI}
            description="This is the primary file uploaded with the dispute."
            extension={metaEvidence.metaEvidenceJSON.fileTypeExtension}
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
    if (metaEvidence?.metaEvidenceJSON?.evidenceDisplayInterfaceURI) {
      const { evidenceDisplayInterfaceURI, _v = "0" } = metaEvidence.metaEvidenceJSON;
      const arbitratorChainID = metaEvidence.metaEvidenceJSON?.arbitratorChainID ?? chainId;
      const arbitrableChainID = metaEvidence.metaEvidenceJSON?.arbitrableChainID ?? arbitratorChainID;

      let url = normalizeIPFSUri(evidenceDisplayInterfaceURI);

      const injectedParams = {
        disputeID: ID,
        chainID: chainId, // Deprecated. Use arbitratorChainID and arbitrableChainID instead.
        arbitratorContractAddress: KlerosLiquid.address,
        arbitratorJsonRpcUrl: getReadOnlyRpcUrl({ chainId: arbitratorChainID }),
        arbitratorChainID,
        arbitrableContractAddress: dispute.arbitrated,
        arbitrableChainID,
        arbitrableJsonRpcUrl: getReadOnlyRpcUrl({ chainId: arbitrableChainID }),
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
                      <div
                        css={`
                          margin-bottom: 20px;
                        `}
                      >
                        {metaEvidence.metaEvidenceJSON.question
                          ? metaEvidence.metaEvidenceJSON.question
                          : "What is your decision?"}
                      </div>
                      {votesData.voted ? (
                        <>
                          <div>
                            You voted for: &ldquo;
                            {votesData.voted === "0"
                              ? "Refuse to Arbitrate"
                              : (metaEvidence.metaEvidenceJSON.rulingOptions &&
                                  realitioLibQuestionFormatter.getAnswerString(
                                    {
                                      decimals: metaEvidence.metaEvidenceJSON.rulingOptions.precision,
                                      outcomes: metaEvidence.metaEvidenceJSON.rulingOptions.titles,
                                      type: metaEvidence.metaEvidenceJSON.rulingOptions.type,
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
                      ) : dispute.period === "0" ? (
                        "Waiting for evidence."
                      ) : dispute.period === "1" ? (
                        !votesData.committed ? (
                          "You did not commit your vote yet."
                        ) : (
                          <small>
                            You committed your vote. You will be able to reveal your vote when the period ends.
                          </small>
                        )
                      ) : subcourts[subcourts.length - 1].hiddenVotes ? (
                        votesData.committed ? (
                          "You did not reveal your vote yet."
                        ) : (
                          "You did not commit a vote in the previous period. You cannot vote anymore."
                        )
                      ) : (
                        "You did not cast a vote."
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
                        : (metaEvidence.metaEvidenceJSON.rulingOptions &&
                            realitioLibQuestionFormatter.getAnswerString(
                              {
                                decimals: metaEvidence.metaEvidenceJSON.rulingOptions.precision,
                                outcomes: metaEvidence.metaEvidenceJSON.rulingOptions.titles,
                                type: metaEvidence.metaEvidenceJSON.rulingOptions.type,
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
                          : (metaEvidence.metaEvidenceJSON.rulingOptions &&
                              realitioLibQuestionFormatter.getAnswerString(
                                {
                                  decimals: metaEvidence.metaEvidenceJSON.rulingOptions.precision,
                                  outcomes: metaEvidence.metaEvidenceJSON.rulingOptions.titles,
                                  type: metaEvidence.metaEvidenceJSON.rulingOptions.type,
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
                    <JustificationBox
                      web3={web3}
                      account={account}
                      onChange={onJustificationChange}
                      justification={justification}
                    />
                  )}
                  {Number(dispute.period) < 3 && !votesData.voted && metaEvidence.metaEvidenceJSON.rulingOptions ? (
                    votesData.committed && committedVote !== undefined ? (
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
                    ) : (
                      <>
                        {metaEvidence.metaEvidenceJSON.rulingOptions.type !== "single-select" && (
                          <StyledButtonsDiv>
                            {metaEvidence.metaEvidenceJSON.rulingOptions.type === "multiple-select" ? (
                              <div
                                css={`
                                  padding-top: 1rem;
                                `}
                              >
                                <Checkbox.Group
                                  disabled={!votesData.canVote}
                                  name="ruling"
                                  onChange={setComplexRuling}
                                  options={
                                    metaEvidence.metaEvidenceJSON.rulingOptions.titles &&
                                    metaEvidence.metaEvidenceJSON.rulingOptions.titles.slice(0, 255)
                                  }
                                  value={complexRuling}
                                />
                              </div>
                            ) : metaEvidence.metaEvidenceJSON.rulingOptions.type === "datetime" ? (
                              <DatePicker
                                disabled={!votesData.canVote}
                                disabledDate={disabledDate}
                                onChange={setComplexRuling}
                                size="large"
                                showTime
                                value={complexRuling}
                              />
                            ) : (
                              <InputNumber
                                disabled={!votesData.canVote}
                                max={Number(
                                  realitioLibQuestionFormatter
                                    .maxNumber({
                                      decimals: metaEvidence.metaEvidenceJSON.rulingOptions.precision,
                                      type: metaEvidence.metaEvidenceJSON.rulingOptions.type,
                                    })
                                    .minus(1)
                                )}
                                min={Number(
                                  realitioLibQuestionFormatter.minNumber({
                                    decimals: metaEvidence.metaEvidenceJSON.rulingOptions.precision,
                                    type: metaEvidence.metaEvidenceJSON.rulingOptions.type,
                                  })
                                )}
                                onChange={setComplexRuling}
                                precision={metaEvidence.metaEvidenceJSON.rulingOptions.precision}
                                size="large"
                                value={complexRuling}
                              />
                            )}
                          </StyledButtonsDiv>
                        )}
                        <StyledButtonsDiv>
                          {metaEvidence.metaEvidenceJSON.rulingOptions.type === "single-select" ? (
                            metaEvidence.metaEvidenceJSON.rulingOptions.titles &&
                            metaEvidence.metaEvidenceJSON.rulingOptions.titles.slice(0, 2 ** 256 - 1).map((t, i) => (
                              <StyledButton
                                disabled={!votesData.canVote}
                                id={i + 1}
                                key={t}
                                onClick={onVoteClick}
                                size="large"
                                type="primary"
                              >
                                {t}
                              </StyledButton>
                            ))
                          ) : (
                            <StyledButton
                              disabled={!votesData.canVote || !complexRuling}
                              onClick={onVoteClick}
                              size="large"
                              type="primary"
                            >
                              Submit
                            </StyledButton>
                          )}
                        </StyledButtonsDiv>
                      </>
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

                  {metaEvidence.metaEvidenceJSON.rulingOptions &&
                    metaEvidence.metaEvidenceJSON.rulingOptions.reserved &&
                    Object.entries(metaEvidence.metaEvidenceJSON.rulingOptions.reserved).map(([ruling, title]) => (
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
            {metaEvidence && metaEvidence.metaEvidenceJSON.title}
            {subcourts && <StyledBreadcrumbs breadcrumbs={subcourts.map((s) => s.name)} />}
          </>
        }
      >
        {metaEvidence && (
          <>
            <Row>
              <Col span={24}>
                <StyledInnerCard actions={metaEvidenceActions}>
                  <ReactMarkdown source={metaEvidence.metaEvidenceJSON.description} />
                  {metaEvidence.metaEvidenceJSON.evidenceDisplayInterfaceURI && (
                    <iframe
                      title="dispute details"
                      style={{ width: "1px", minWidth: "100%", height: "360px", border: "none" }}
                      src={evidenceDisplayInterfaceURL}
                    />
                  )}
                  {metaEvidence.metaEvidenceJSON.arbitrableInterfaceURI && (
                    <ArbitrableInterfaceDiv>
                      <a
                        href={metaEvidence.metaEvidenceJSON.arbitrableInterfaceURI}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
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
                subcourtID={dispute.subcourtID}
                subcourt={subcourtObj}
              />
            </div>
            <CollapsableCard
              title={
                <>
                  <Folder /> {`Evidence (${evidence ? evidence.length : 0})`}
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
              metaEvidence.metaEvidenceJSON.rulingOptions &&
              metaEvidence.metaEvidenceJSON.rulingOptions.type === "single-select" && (
                <CollapsableCard
                  title={
                    <>
                      <Scales /> Dispute History
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
                : (metaEvidence.metaEvidenceJSON.rulingOptions &&
                    realitioLibQuestionFormatter.getAnswerString(
                      {
                        decimals: metaEvidence.metaEvidenceJSON.rulingOptions.precision,
                        outcomes: metaEvidence.metaEvidenceJSON.rulingOptions.titles,
                        type: metaEvidence.metaEvidenceJSON.rulingOptions.type,
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

JustificationBox.propTypes = {
  web3: PropTypes.object,
  account: PropTypes.string,
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
