import React, { useCallback, useMemo, useState } from "react";
import PropTypes from "prop-types";
import styled from "styled-components/macro";
import { Button, Card, Col, Row, Spin } from "antd";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import * as realitioLibQuestionFormatter from "@reality.eth/reality-eth-lib/formatters/question";
import ReactMarkdown from "react-markdown";
import Web3 from "web3";
import { ReactComponent as Document } from "../assets/images/document.svg";
import { ReactComponent as Folder } from "../assets/images/folder.svg";
import { ReactComponent as Gavel } from "../assets/images/gavel.svg";
import { ReactComponent as Hourglass } from "../assets/images/hourglass.svg";
import { ReactComponent as Scales } from "../assets/images/scales.svg";
import { useDataloader, VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import useChainId from "../hooks/use-chain-id";
import Attachment from "./attachment";
import DisputeTimeline from "./dispute-timeline";
import CaseRoundHistory from "./case-round-history";
import CollapsableCard from "./collapsable-card";
import CourtDrawer from "./court-drawer";
import EvidenceTimeline from "./evidence-timeline";

const { useDrizzle, useDrizzleState } = drizzleReactHooks;
const { toBN } = Web3.utils;

export default function CaseDetailsCard({ ID }) {
  const { drizzle, useCacheCall, useCacheEvents } = useDrizzle();
  const drizzleState = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
  }));
  const { KlerosLiquid } = drizzle.contracts;

  const loadPolicy = useDataloader.loadPolicy();
  const getMetaEvidence = useDataloader.getMetaEvidence();
  const getEvidence = useDataloader.getEvidence();
  const [activeSubcourtID, setActiveSubcourtID] = useState();
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
    const voteCounter = call("KlerosLiquid", "getVoteCounter", ID, 0);
    if (dispute && disputeExtraInfo && draws) {
      const drawnInCurrentRound = false;
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
            currentRuling: voteCounter?.winningChoice,
            drawnInCurrentRound,
            loading: !voteCounter,
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

  const metaEvidenceActions = useMemo(() => {
    if (metaEvidence) {
      const actions = [];
      if (metaEvidence.metaEvidenceJSON.fileURI)
        actions.push(
          <Attachment
            URI={metaEvidence.metaEvidenceJSON.fileURI}
            description="Este es el documento principal de la disputa."
            extension={metaEvidence.metaEvidenceJSON.fileTypeExtension}
            title="Documento principal"
          />
        );
      actions.push(
        <StyledInnerCardActionsTitleDiv className="ternary-color theme-color">
          Documento Principal
        </StyledInnerCardActionsTitleDiv>
      );
      return actions;
    }
  }, [metaEvidence]);

  return (
    <>
      <StyledCard
        actions={[
          <Spin key="main" spinning={votesData.loading || !subcourts || !metaEvidence}>
            {!votesData.loading && subcourts && metaEvidence && disputeExtraInfo ? (
              <>
                <StyledActionsDiv className="secondary-linear-background theme-linear-background">
                  {new Set(["0", "1", "2", "3"]).has(dispute.period) && disputeExtraInfo.votesLengths.length <= 1 ? (
                    <Hourglass />
                  ) : (
                    <Gavel />
                  )}
                  {new Set(["3", "4"]).has(dispute.period) || disputeExtraInfo.votesLengths.length > 1 ? (
                    <SecondaryActionText>
                      Decisión Final{"\n"}El ganador de este caso fue:{"\n"}
                      {votesData.currentRuling === "0"
                        ? "No arbitrar"
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
                    </SecondaryActionText>
                  ) : (
                    <>
                      {dispute.period === "0" && (
                        <SecondaryActionText>
                          Estamos en periodo de evidencia.{"\n"}La votación todavía no ha empezado.
                        </SecondaryActionText>
                      )}
                      {new Set(["1", "2"]).has(dispute.period) && (
                        <SecondaryActionText>
                          Estamos en periodo de votación.{"\n"}El jurado está votando.
                        </SecondaryActionText>
                      )}
                    </>
                  )}
                </StyledActionsDiv>
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
            <StyledDocument /> Politicas
          </StyledPoliciesButton>
        }
        loading={!metaEvidence}
        title={<> {metaEvidence && metaEvidence.metaEvidenceJSON.title} </>}
      >
        {metaEvidence && (
          <>
            <Row>
              <div style={{ marginBottom: "2rem" }}>
                <DisputeTimeline
                  period={Number(dispute.period)}
                  lastPeriodChange={dispute.lastPeriodChange}
                  subcourtID={dispute.subcourtID}
                  subcourt={subcourtObj}
                />
              </div>
              <Col span={24}>
                <StyledInnerCard actions={metaEvidenceActions}>
                  <ReactMarkdown source={metaEvidence.metaEvidenceJSON.description} />
                </StyledInnerCard>
              </Col>
            </Row>
            <CollapsableCard
              title={
                <>
                  <Folder /> {`Evidencias (${evidence ? evidence.length : 0})`}
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
                      <Scales /> Historial de votación
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
    </>
  );
}

CaseDetailsCard.propTypes = {
  ID: PropTypes.string.isRequired,
};

realitioLibQuestionFormatter.minNumber = realitioLibQuestionFormatter.minNumber.bind({
  maxNumber: (...args) => {
    const result = realitioLibQuestionFormatter.maxNumber(...args);
    result.neg = result.negated;
    return result;
  },
});

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
  svg {
    height: 150px;
    opacity: 0.15;
    position: absolute;
    top: 50px;
    width: 150px;
  }
`;

const SecondaryActionText = styled.div`
  margin-top: 30px;
  white-space: pre-line;
`;

const StyledPoliciesButton = styled(Button)`
  border: 1px solid #4d00b4;
  border-radius: 3px;
  box-sizing: border-box;
  color: #4d00b4;
  padding-left: 40px;
  position: relative;
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
