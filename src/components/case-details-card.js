import * as realitioLibQuestionFormatter from "@reality.eth/reality-eth-lib/formatters/question";
import { useConfig } from "@usedapp/core";
import { Button, Card, Col, Icon, Row, Spin } from "antd";
import { BigNumber } from "ethers";
import PropTypes from "prop-types";
import React, { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import styled from "styled-components/macro";
import { ReactComponent as Document } from "../assets/images/document.svg";
import { ReactComponent as Folder } from "../assets/images/folder.svg";
import { ReactComponent as Gavel } from "../assets/images/gavel.svg";
import { ReactComponent as Hourglass } from "../assets/images/hourglass.svg";
import { ReactComponent as Scales } from "../assets/images/scales.svg";
import archon from "../bootstrap/archon";
import { getReadOnlyRpcUrl } from "../bootstrap/web3";
import { getMetaEvidence } from "../helpers/get-meta-evidence";
import { getPolicyDocument } from "../helpers/get-policy-document";
import useContract from "../hooks/use-contract";
import Attachment from "./attachment";
import CaseRoundHistory from "./case-round-history";
import CollapsableCard from "./collapsable-card";
import CourtDrawer from "./court-drawer";
import DisputeTimeline from "./dispute-timeline";
import EvidenceTimeline from "./evidence-timeline";

export default function CaseDetailsCard({ ID }) {
  const config = useConfig();
  const { klerosLiquid, policyRegistry } = useContract({ chainID: config.readOnlyChainId });
  const [isLoading, setIsLoading] = useState(true);
  const [caseData, setCaseData] = useState({});
  const [activeSubcourtID, setActiveSubcourtID] = useState();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        const dispute = await getDisputeData();

        const [disputeExtraInfo] = await Promise.all([
          getSubcourtsData(dispute),
          getSubcourtObject(dispute),
          getMetaEvidenceData(dispute),
          getEvidenceData(dispute.arbitrated, klerosLiquid.address, ID),
          getDisputeExtraInfoData(),
        ]);

        await getVoteData(dispute, disputeExtraInfo);

        setIsLoading(false);
      } catch (error) {
        console.error(error);
      }
    };

    fetchData();
  }, [ID]);

  const getVoteData = async (dispute, disputeExtraInfo) => {
    try {
      const filter = klerosLiquid.filters.Draw(null, ID);
      await klerosLiquid
        .queryFilter(filter, parseInt(process.env.REACT_APP_KLEROS_LIQUID_BLOCK_NUMBER))
        .then(async (result) => {
          let votesData = { loading: true };
          const voteCounter = await klerosLiquid.getVoteCounter(ID, 0);
          if (dispute && disputeExtraInfo && result) {
            const drawnInCurrentRound = false;
            const vote =
              drawnInCurrentRound &&
              (await klerosLiquid.getVote(
                ID,
                result[result.length - 1].args._appeal,
                result[result.length - 1].args._voteID
              ));
            const subcourt = drawnInCurrentRound && (await klerosLiquid.courts(dispute.subcourtID));
            const disputeVoteLength = disputeExtraInfo.value?.votesLengths[0].toString();
            if (!drawnInCurrentRound || (vote && subcourt)) {
              const committed =
                drawnInCurrentRound &&
                vote.commit !== "0x0000000000000000000000000000000000000000000000000000000000000000";
              votesData = result.reduce(
                (acc, d) => {
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
          setCaseData((oldData) => ({ ...oldData, votesDataObject: votesData }));
          return votesData;
        })
        .catch((err) => console.error(err));
    } catch (err) {
      console.error(err);
    }
  };

  const getEvidenceData = async (contractAddress, arbitratorAddress, disputeID, options) => {
    const dispute = await archon.arbitrable.getDispute(contractAddress, arbitratorAddress, disputeID, {
      ...options,
    });

    const evidence = await archon.arbitrable.getEvidence(contractAddress, arbitratorAddress, dispute.evidenceGroupID, {
      ...options,
    });

    const filteredEvidence = evidence.filter((e) => e.evidenceJSONValid && (!e.evidenceJSON.fileURI || e.fileValid));

    setCaseData((oldData) => ({ ...oldData, evidence: filteredEvidence }));
    return filteredEvidence;
  };

  const getSubcourtsData = async (dispute) => {
    const subcourts = [];
    try {
      if (dispute) {
        let nextID = dispute.subcourtID;
        while (!subcourts.length || subcourts[subcourts.length - 1].ID.toString() !== nextID.toString()) {
          const subcourt = {
            ID: nextID,
            hiddenVotes: undefined,
            name: undefined,
          };
          const policy = await policyRegistry.policies(subcourt.ID);

          if (policy !== undefined) {
            const policyJSON = await getPolicyDocument(policy);
            if (policyJSON) {
              subcourt.name = policyJSON.name;
              subcourt.description = policyJSON.description;
              subcourt.summary = policyJSON.summary;
            }
          }
          const _subcourt = await klerosLiquid.courts(subcourt.ID);
          if (_subcourt) {
            nextID = _subcourt.parent;
            subcourt.hiddenVotes = _subcourt.hiddenVotes;
          }
          if (subcourt.name === undefined || !_subcourt) return undefined;
          subcourts.push(subcourt);
        }
        setCaseData((oldData) => ({ ...oldData, subcourts: subcourts.reverse() }));
        return subcourts.reverse();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const metaEvidenceActions = useMemo(() => {
    if (caseData?.metaEvidence) {
      const actions = [];
      if (caseData.metaEvidence.metaEvidenceJSON?.fileURI)
        actions.push(
          <Attachment
            URI={caseData.metaEvidence.metaEvidenceJSON.fileURI}
            description="Este es el documento principal de la disputa."
            extension={caseData.metaEvidence.metaEvidenceJSON.fileTypeExtension}
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
  }, [caseData?.metaEvidence]);

  const getSubcourtObject = async (dispute) => {
    try {
      const subcourtObject = await klerosLiquid.getSubcourt(dispute.subcourtID);
      setCaseData((oldData) => ({ ...oldData, subcourtObject: subcourtObject }));
      return subcourtObject;
    } catch (err) {
      console.error(err);
    }
  };

  const getDisputeData = async () => {
    try {
      const dispute = await klerosLiquid.disputes(ID);
      setCaseData((oldData) => ({ ...oldData, dispute: dispute }));
      return dispute;
    } catch (err) {
      console.error(err);
    }
  };

  const getDisputeExtraInfoData = async () => {
    try {
      const disputeExtraInfo = await klerosLiquid.getDispute(ID);
      setCaseData((oldData) => ({ ...oldData, disputeExtraInfo: disputeExtraInfo }));
      return disputeExtraInfo;
    } catch (err) {
      console.error(err);
    }
  };

  const getMetaEvidenceData = async (dispute) => {
    if (dispute.ruled) {
      const metaEvidence = await getMetaEvidence(100, dispute.arbitrated, klerosLiquid.address, ID, {
        strict: false,
      });
      setCaseData((oldData) => ({ ...oldData, metaEvidence: metaEvidence }));
      return metaEvidence;
    } else {
      const metaEvidence = await getMetaEvidence(100, dispute.arbitrated, klerosLiquid.address, ID);
      setCaseData((oldData) => ({ ...oldData, metaEvidence: metaEvidence }));
      return metaEvidence;
    }
  };

  const evidenceDisplayInterfaceURL = useMemo(() => {
    const normalizeIPFSUri = (uri) => uri.replace(/^\/ipfs\//, "https://ipfs.kleros.io/ipfs/");
    if (caseData?.metaEvidence?.metaEvidenceJSON?.evidenceDisplayInterfaceURI) {
      const { evidenceDisplayInterfaceURI, _v = "0" } = caseData.metaEvidence.metaEvidenceJSON;
      const arbitratorChainID = caseData.metaEvidence.metaEvidenceJSON?.arbitratorChainID ?? config.readOnlyChainId;
      const arbitrableChainID = caseData.metaEvidence.metaEvidenceJSON?.arbitrableChainID ?? arbitratorChainID;

      let url = normalizeIPFSUri(evidenceDisplayInterfaceURI);

      const injectedParams = {
        disputeID: ID,
        chainID: config.readOnlyChainId, // Deprecated. Use arbitratorChainID and arbitrableChainID instead.
        arbitratorContractAddress: klerosLiquid.address,
        arbitratorJsonRpcUrl: getReadOnlyRpcUrl({ chainId: arbitratorChainID }),
        arbitratorChainID,
        arbitrableContractAddress: caseData.dispute.arbitrated,
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
  }, [caseData?.metaEvidence, ID, caseData?.dispute, klerosLiquid.address]);

  return (
    <>
      <StyledCard
        actions={[
          <Spin key="main" spinning={isLoading || !caseData.subcourts || !caseData.metaEvidence}>
            {caseData.subcourts &&
            caseData.metaEvidence &&
            caseData.disputeExtraInfo &&
            caseData.metaEvidence?.metaEvidenceJSON ? (
              <>
                <StyledActionsDiv className="secondary-linear-background theme-linear-background">
                  {new Set(["0", "1", "2", "3"]).has(caseData.dispute.period) &&
                  caseData.disputeExtraInfo.votesLengths.length <= 1 ? (
                    <Hourglass />
                  ) : (
                    <Gavel />
                  )}
                  {new Set(["3", "4"]).has(caseData.dispute.period) ||
                  caseData.disputeExtraInfo.votesLengths.length > 1 ? (
                    <SecondaryActionText>
                      Decisión Final{"\n"}El ganador de este caso fue:{"\n"}
                      {caseData.votesDataObject?.currentRuling.toString() === "0"
                        ? "No arbitrar"
                        : (caseData?.votesDataObject?.currentRuling &&
                            caseData.metaEvidence?.metaEvidenceJSON?.rulingOptions &&
                            realitioLibQuestionFormatter.getAnswerString(
                              {
                                decimals: caseData.metaEvidence.metaEvidenceJSON.rulingOptions.precision,
                                outcomes: caseData.metaEvidence.metaEvidenceJSON.rulingOptions.titles,
                                type: caseData.metaEvidence.metaEvidenceJSON.rulingOptions.type,
                              },
                              realitioLibQuestionFormatter.padToBytes32(
                                BigNumber.from(caseData.votesDataObject.currentRuling).sub(BigNumber.from(1))
                              )
                            )) ||
                          "Unknown Choice"}
                    </SecondaryActionText>
                  ) : (
                    <>
                      {caseData.dispute.period === "0" && (
                        <SecondaryActionText>
                          Estamos en periodo de evidencia.{"\n"}La votación todavía no ha empezado.
                        </SecondaryActionText>
                      )}
                      {new Set(["1", "2"]).has(caseData.dispute.period) && (
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
            onClick={() => {
              caseData && caseData?.dispute && setActiveSubcourtID(caseData?.dispute.subcourtID.toString());
            }}
          >
            <StyledDocument /> Politicas
          </StyledPoliciesButton>
        }
        loading={!caseData?.metaEvidence}
        title={
          caseData?.metaEvidence?.metaEvidenceJSON ? (
            <> {caseData.metaEvidence && caseData.metaEvidence.metaEvidenceJSON.title} </>
          ) : (
            <></>
          )
        }
      >
        {caseData?.metaEvidence && caseData?.subcourtObject && caseData?.dispute && (
          <>
            <Row>
              <div style={{ marginBottom: "2rem" }}>
                <DisputeTimeline
                  period={Number(caseData.dispute.period)}
                  lastPeriodChange={Number(caseData.dispute.lastPeriodChange)}
                  subcourtID={caseData.dispute.subcourtID}
                  subcourt={caseData.subcourtObject}
                />
              </div>
              {caseData.metaEvidence?.metaEvidenceJSON && (
                <Col span={24}>
                  <StyledInnerCard actions={metaEvidenceActions}>
                    <ReactMarkdown source={caseData.metaEvidence.metaEvidenceJSON.description} />
                    {caseData.metaEvidence.metaEvidenceJSON.evidenceDisplayInterfaceURI && (
                      <iframe
                        title="dispute details"
                        style={{ width: "1px", minWidth: "100%", height: "auto", border: "none" }}
                        src={evidenceDisplayInterfaceURL}
                      />
                    )}
                    {caseData.metaEvidence.metaEvidenceJSON.arbitrableInterfaceURI && (
                      <ArbitrableInterfaceDiv>
                        <a
                          href={caseData.metaEvidence.metaEvidenceJSON.arbitrableInterfaceURI}
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
              )}
            </Row>
            <CollapsableCard
              title={
                <>
                  <Folder /> {`Evidencias (${caseData.evidence ? caseData.evidence.length : 0})`}
                </>
              }
            >
              <EvidenceTimeline
                evidence={caseData.evidence}
                metaEvidence={caseData.metaEvidence}
                ruling={caseData.dispute.period === "4" ? caseData.votesDataObject.currentRuling.toString() : null}
                chainId={1}
              />
            </CollapsableCard>
            {caseData.disputeExtraInfo &&
              caseData.metaEvidence &&
              caseData.metaEvidence.metaEvidenceJSON?.rulingOptions &&
              caseData.metaEvidence.metaEvidenceJSON?.rulingOptions.type === "single-select" && (
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
                      ...caseData.disputeExtraInfo,
                      ...caseData.dispute,
                    }}
                    ruling={caseData.dispute.period === "4" ? caseData.votesDataObject.currentRuling.toString() : null}
                    metaEvidence={caseData.metaEvidence}
                  />
                </CollapsableCard>
              )}
          </>
        )}
      </StyledCard>
      {activeSubcourtID !== undefined && caseData?.subcourts && (
        <CourtDrawer ID={activeSubcourtID} subcourts={caseData?.subcourts} onClose={setActiveSubcourtID} />
      )}
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

const ArbitrableInterfaceDiv = styled.div`
  border-top: 1px solid #d09cff;
  font-size: 18px;
  padding: 20px 0px 5px 0px;

  a {
    color: #4d00b4;
  }
`;
