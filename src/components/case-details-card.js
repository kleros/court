import * as realitioLibQuestionFormatter from "@reality.eth/reality-eth-lib/formatters/question";
import { Button, Card, Col, Icon, Row, Spin } from "antd";
import { BigNumber } from "ethers";
import PropTypes from "prop-types";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import styled from "styled-components/macro";
import { ReactComponent as Document } from "../assets/images/document.svg";
import { ReactComponent as Folder } from "../assets/images/folder.svg";
import { ReactComponent as Gavel } from "../assets/images/gavel.svg";
import { ReactComponent as Hourglass } from "../assets/images/hourglass.svg";
import { ReactComponent as Scales } from "../assets/images/scales.svg";
import archon from "../bootstrap/archon";
import { useDataloader } from "../bootstrap/dataloader";
import { getReadOnlyRpcUrl } from "../bootstrap/web3";
import useContract from "../hooks/use-contract";
import Attachment from "./attachment";
import CaseRoundHistory from "./case-round-history";
import CollapsableCard from "./collapsable-card";
import CourtDrawer from "./court-drawer";
import DisputeTimeline from "./dispute-timeline";
import EvidenceTimeline from "./evidence-timeline";

// function useVoteData(dispute, drawnInCurrentRound, draws, ID, disputeExtraInfo, voteCounter) {
//   const vote = usePromise(React.useCallback, () => klerosLiquid.getVote(ID, draws.args._appeal, draws.args._voteID), [
//     ID,
//   ]);

//   const subcourt = usePromise(React.useCallback, () => klerosLiquid.courts(dispute.subcourtID), [ID]);
//   console.log("🚀 ~ file: case-details-card.js:17 ~ getVoteData ~ vote:", vote);
//   console.log("🚀 ~ file: case-details-card.js:20 ~ getVoteData ~ subcourt:", subcourt);

//   const disputeVoteLength = disputeExtraInfo.value?.votesLengths[0].toString();

//   if (!drawnInCurrentRound || (vote && subcourt)) {
//     const committed =
//       drawnInCurrentRound && vote.commit !== "0x0000000000000000000000000000000000000000000000000000000000000000";
//     if (draws.isFulfilled) {
//       let votesData = draws.value.reduce(
//         (acc, d) => {
//           console.log("acc", acc);
//           console.log("d", d);
//           if (d.args._appeal.toString() === disputeVoteLength - 1) acc.voteIDs.push(d.args._voteIDs.toString());
//           return acc;
//         },
//         {
//           canVote:
//             drawnInCurrentRound &&
//             ((dispute.period === "1" && !committed) ||
//               (dispute.period === "2" && (!subcourt.hiddenVotes || committed) && !vote.voted)),
//           committed,
//           commit: vote.commit,
//           currentRuling: voteCounter?.winningChoice,
//           drawnInCurrentRound,
//           loading: !voteCounter,
//           voteIDs: [],
//           voted: vote.voted && vote.choice,
//         }
//       );
//     }
//   }

//   return { vote, subcourt };
// }

export default function CaseDetailsCard({ ID }) {
  const { klerosLiquid, policyRegistry } = useContract({ chainID: 1 });
  const [isLoading, setIsLoading] = useState(false);
  const [votesDataObject, setVotesDataObject] = useState();
  // const { provider } = getReadOnlyWeb3({ chainId: 5 });

  // const loadPolicy = useDataloader.loadPolicy();
  // const getMetaEvidence = useDataloader.getMetaEvidence();
  const getEvidence = useDataloader.getEvidence();
  const [activeSubcourtID, setActiveSubcourtID] = useState();

  // const policyJSON = loadPolicy("/ipfs/QmXvtokEk3qPiB2WPXXUpd4xCoAr5xeceS1n4BHHqNpP7p");
  // console.log("line 62 policy", policyJSON);

  let dispute;
  let disputeExtraInfo;

  const getDisputeData = async () => {
    try {
      console.log("klerosLiquid", klerosLiquid);
      dispute = await klerosLiquid.disputes(ID);
      console.log("🚀 ~ file: case-details-card.js:75 ~ getDisputeData ~ dispute:", dispute);
      disputeExtraInfo = await klerosLiquid.getDispute(ID);
      // setDispute(disputeData)
      // disputeExtraInfo(disputeExtraInfo)
    } catch (err) {
      console.error(err);
    }
  };
  let draws;

  useEffect(async () => {
    await getDisputeData();
    const voteData = await getVoteData();
    setIsLoading(false);
    setVotesDataObject(voteData);
    await getSubcourts();
    getMetaEvidenceData();
    await getSubcourtObject();
    console.log("dispute", dispute);
    console.log("disputeExtraInfo", disputeExtraInfo);
    console.log("draws", draws);
  }, [ID]);

  const getVoteData = async () => {
    try {
      const filter = klerosLiquid.filters.Draw(null, ID);
      setIsLoading(true);
      draws = await klerosLiquid
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
          console.log("votesData", votesData);
          return votesData;
        });
      console.log(draws, "heyy");
      // const drawnInCurrentRound = false;
      // const vote = await ;
      // const subcourt = klerosLiquid.courts(dispute.subcourtID);

      // console.log("🚀 ~ file: case-details-card.js:17 ~ getVoteData ~ vote:", vote);
      // console.log("🚀 ~ file: case-details-card.js:20 ~ getVoteData ~ subcourt:", subcourt);

      // const disputeVoteLength = disputeExtraInfo.value?.votesLengths[0].toString();

      // if (!drawnInCurrentRound || (vote && subcourt)) {
      //   const committed =
      //     drawnInCurrentRound && vote.commit !== "0x0000000000000000000000000000000000000000000000000000000000000000";
      //   if (draws) {
      //     let votesData = draws.value.reduce(
      //       (acc, d) => {
      //         console.log("acc", acc);
      //         console.log("d", d);
      //         if (d.args._appeal.toString() === disputeVoteLength - 1) acc.voteIDs.push(d.args._voteIDs.toString());
      //         return acc;
      //       },
      //       {
      //         canVote:
      //           drawnInCurrentRound &&
      //           ((dispute.period === "1" && !committed) ||
      //             (dispute.period === "2" && (!subcourt.hiddenVotes || committed) && !vote.voted)),
      //         committed,
      //         commit: vote.commit,
      //         currentRuling: voteCounter?.winningChoice,
      //         drawnInCurrentRound,
      //         loading: !voteCounter,
      //         voteIDs: [],
      //         voted: vote.voted && vote.choice,
      //       }
      //     );
      //   }
      // }
    } catch (err) {
      console.error(err);
    }
  };

  // const results = useCall({ contract: policyRegistry, method: "policies", args: [dispute?.subcourtID] });
  // console.log("🚀 ~ file: case-details-card.js:190 ~ results ~ results:", results);
  // console.log("🚀 ~ file: case-details-card.js:190 ~ results ~ dispute subcortID", dispute);

  const getPolicyDocument = async (URI, options) => {
    console.log("URI", URI);
    if (!options) options = {};
    if (URI.startsWith("/ipfs/")) options.preValidated = true;

    return archon.utils
      .validateFileFromURI(URI.replace(/^\/ipfs\//, "https://ipfs.kleros.io/ipfs/"), {
        ...options,
      })
      .then((res) => res.file)
      .catch(() => ({
        description: "Please contact the governance team.",
        name: "Invalid Court Data",
        summary:
          "The data for this court is not formatted correctly or has been tampered since the time of its submission.",
      }));
  };

  const subcourts = [];

  const getSubcourts = async () => {
    try {
      if (dispute) {
        let nextID = dispute.subcourtID;
        while (!subcourts.length || subcourts[subcourts.length - 1].ID.toString() !== nextID.toString()) {
          console.log("subcourts[subcourts.length - 1].ID", subcourts[subcourts.length - 1]?.ID);
          console.log("nextID", nextID.toString());
          const subcourt = {
            ID: nextID,
            hiddenVotes: undefined,
            name: undefined,
          };
          const policy = await policyRegistry.policies(subcourt.ID);

          if (policy !== undefined) {
            console.log("🚀 ~ file: case-details-card.js:191 ~ getSubcourts ~ policy:", policy);
            const policyJSON = await getPolicyDocument(policy);
            console.log("🚀 ~ file: case-details-card.js:193 ~ getSubcourts ~ policyJSON:", policyJSON);
            if (policyJSON) subcourt.name = policyJSON.name;
          }
          console.log("subcourt name", subcourt.name);
          const _subcourt = await klerosLiquid.courts(subcourt.ID);
          if (_subcourt) {
            nextID = _subcourt.parent;
            subcourt.hiddenVotes = _subcourt.hiddenVotes;
          }
          if (subcourt.name === undefined || !_subcourt) return undefined;
          subcourts.push(subcourt);
          console.log("subcourts 233", subcourts);
        }

        return subcourts.reverse();
      }

      // console.log("policy", policy);

      // console.log("nextID", nextID);
    } catch (err) {
      console.error(err);
    }
  };

  // const draws = usePromise(
  //   React.useCallback(
  //     () => klerosLiquid.queryFilter(filter, parseInt(process.env.REACT_APP_KLEROS_LIQUID_BLOCK_NUMBER) ),
  //     [ID]
  //   )
  // );

  // const { vote, subcourt } = useVoteData(
  //   dispute || null,
  //   drawnInCurrentRound,
  //   draws || null,
  //   ID,
  //   disputeExtraInfo || null,
  //   voteCounter
  // );
  // console.log("🚀 ~ file: case-details-card.js:67 ~ CaseDetailsCard ~ votesData:", vote);
  // console.log(
  //   "🚀 ~ file: case-details-card.js:63 ~ CaseDetailsCard ~ disputeExtraInfo:",
  //   disputeExtraInfo.value?.votesLengths[0].toString()
  // );
  // const draws = useCacheEvents(
  //   "KlerosLiquid",
  //   "Draw",
  //   useMemo(
  //     () => ({
  //       filter: { _address: drizzleState.account, _disputeID: ID },
  //       fromBlock: process.env.REACT_APP_KLEROS_LIQUID_BLOCK_NUMBER,
  //     }),
  //     [drizzleState.account, ID]
  //   )
  // );

  // console.log("🚀 ~ file: case-details-card.js:80 ~ CaseDetailsCard ~ draws:", draws);

  // if (dispute && disputeExtraInfo && draws) {
  //   // console.log("🚀 ~ file: case-details-card.js:74 ~ CaseDetailsCard ~ voteData:", voteData);
  // }

  // const votesData = useCacheCall(["KlerosLiquid"], (call) => {
  //   let votesData = { loading: true };
  //   const voteCounter = call("KlerosLiquid", "getVoteCounter", ID, 0);
  //   if (dispute && disputeExtraInfo && draws) {
  //     const drawnInCurrentRound = false;
  //     const vote =
  //       drawnInCurrentRound &&
  //       call(
  //         "KlerosLiquid",
  //         "getVote",
  //         ID,
  //         draws[draws.length - 1].returnValues._appeal,
  //         draws[draws.length - 1].returnValues._voteID
  //       );
  //     const subcourt = drawnInCurrentRound && call("KlerosLiquid", "courts", dispute.subcourtID);
  //     if (!drawnInCurrentRound || (vote && subcourt)) {
  //       const committed =
  //         drawnInCurrentRound && vote.commit !== "0x0000000000000000000000000000000000000000000000000000000000000000";
  //       votesData = draws.reduce(
  //         (acc, d) => {
  //           if (Number(d.returnValues._appeal) === disputeExtraInfo.votesLengths.length - 1)
  //             acc.voteIDs.push(d.returnValues._voteID);
  //           return acc;
  //         },
  //         {
  //           canVote:
  //             drawnInCurrentRound &&
  //             ((dispute.period === "1" && !committed) ||
  //               (dispute.period === "2" && (!subcourt.hiddenVotes || committed) && !vote.voted)),
  //           committed,
  //           commit: vote.commit,
  //           currentRuling: voteCounter?.winningChoice,
  //           drawnInCurrentRound,
  //           loading: !voteCounter,
  //           voteIDs: [],
  //           voted: vote.voted && vote.choice,
  //         }
  //       );
  //     }
  //   }
  //   return votesData;
  // });
  // const subcourts = useCacheCall(["PolicyRegistry", "KlerosLiquid"], (call) => {
  //   if (dispute) {
  //     const subcourts = [];
  //     let nextID = dispute.subcourtID;
  //     while (!subcourts.length || subcourts[subcourts.length - 1].ID !== nextID) {
  //       const subcourt = {
  //         ID: nextID,
  //         hiddenVotes: undefined,
  //         name: undefined,
  //       };
  //       const policy = call("PolicyRegistry", "policies", subcourt.ID);
  //       if (policy !== undefined) {
  //         const policyJSON = loadPolicy(policy);
  //         if (policyJSON) subcourt.name = policyJSON.name;
  //       }
  //       const _subcourt = call("KlerosLiquid", "courts", subcourt.ID);
  //       if (_subcourt) {
  //         nextID = _subcourt.parent;
  //         subcourt.hiddenVotes = _subcourt.hiddenVotes;
  //       }
  //       if (subcourt.name === undefined || !_subcourt) return undefined;
  //       subcourts.push(subcourt);
  //     }
  //     return subcourts.reverse();
  //   }
  // });

  // if (dispute) {
  //   const subcourts = [];
  //   let nextID = dispute.value.subcourtID;
  //   while (!subcourts.length || subcourts[subcourts.length - 1].ID !== nextID) {
  //     subcourt = {
  //       ID: nextID,
  //       hiddenVotes: undefined,
  //       name: undefined,
  //     };

  //     const _subcourt = call("KlerosLiquid", "courts", subcourt.ID);
  //     if (_subcourt) {
  //       nextID = _subcourt.parent;
  //       subcourt.hiddenVotes = _subcourt.hiddenVotes;
  //     }
  //     if (subcourt.name === undefined || !_subcourt) return undefined;
  //     subcourts.push(subcourt);
  //   }
  //   return subcourts.reverse();
  // }
  // const policy = usePromise(React.useCallback(() => policyRegistry.policies(subcourt.ID), [subcourt.ID]));
  // console.log("🚀 ~ file: case-details-card.js:198 ~ CaseDetailsCard ~ policy:", policy);
  // console.log("🚀 ~ file: case-details-card.js:198 ~ CaseDetailsCard ~ subcourt.ID:", subcourt.ID);
  // // const _subcourt = call("KlerosLiquid", "courts", subcourt.value.ID);
  // const _subcourt = usePromise(React.useCallback(() => klerosLiquid.courts(subcourt.ID), [subcourt.ID]));
  // console.log("🚀 ~ file: case-details-card.js:201 ~ CaseDetailsCard ~ _subcourt:", _subcourt);

  // if (dispute) {
  //   let nextID = dispute.subcourtID;
  //   const subcourt = [];
  //   while (!subcourts.length || subcourts[subcourts.length - 1].ID !== nextID) {
  //     const subcourt = {
  //       ID: nextID,
  //       hiddenVotes: undefined,
  //       name: undefined,
  //     };
  //     if (policy !== undefined) {
  //       const policyJSON = loadPolicy(policy);
  //       if (policyJSON) subcourt.name = policyJSON.name;
  //     }
  //     if (_subcourt) {
  //       nextID = _subcourt.parent;
  //       subcourt.hiddenVotes = _subcourt.hiddenVotes;
  //     }
  //     if (subcourt.name === undefined || !_subcourt) return undefined;
  //     subcourts.push(subcourt);
  //   }
  //   return subcourts.reverse();
  // }
  // //Added for DisputeTimeline
  // const subcourtObj = useCacheCall(["KlerosLiquid"], (call) => {
  //   if (dispute) {
  //     const subcourt = call("KlerosLiquid", "courts", dispute.subcourtID);
  //     const subcourtObj = call("KlerosLiquid", "getSubcourt", dispute.subcourtID);
  //     return { ...subcourt, ...subcourtObj };
  //   }
  // });
  let metaEvidence;
  let evidence;

  const metaEvidenceActions = useMemo(() => {
    console.log("meta evidence", metaEvidence);
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

  let subcourtObject;

  const getSubcourtObject = async () => {
    try {
      // const subcourt = await klerosLiquid.courts(dispute.subcourtID);
      subcourtObject = await klerosLiquid.getSubcourt(dispute.subcourtID);
    } catch (err) {
      console.error(err);
    }
  };

  // const chainId = useChainId();
  console.log("dispute 427", dispute);

  const getMetaEvidenceData = async () => {
    if (dispute) {
      console.log("dispute 430 within if", dispute);
      if (dispute.ruled) {
        metaEvidence = await getMetaEvidence(1, dispute.arbitrated, klerosLiquid.address, ID, {
          strict: false,
        });
        console.log("🚀 ~ file: case-details-card.js:435 ~ getMetaEvidenceData ~ metaEvidence:", metaEvidence);
      } else {
        metaEvidence = await getMetaEvidence(1, dispute.arbitrated, klerosLiquid.address, ID);
      }

      evidence = getEvidence(dispute.arbitrated, klerosLiquid.address, ID);
      console.log("🚀 ~ file: case-details-card.js:442 ~ getMetaEvidenceData ~ evidence:", evidence);
    }
  };

  const getMetaEvidence = async (arbitratorChainID, contractAddress, arbitratorAddress, disputeID, options) => {
    try {
      const dispute = await archon.arbitrable.getDispute(contractAddress, arbitratorAddress, disputeID, { ...options });

      const metaEvidence = await archon.arbitrable.getMetaEvidence(
        contractAddress,
        disputeID === "560" ? "2" : dispute.metaEvidenceID,
        {
          strict: true,
          getJsonRpcUrl: (chainId) => getReadOnlyRpcUrl({ chainId }),
          scriptParameters: {
            disputeID,
            arbitratorChainID,
            arbitratorContractAddress: arbitratorAddress,
            // arbitrableContractAddress is injected automatically by archon
          },
          ...options,
        }
      );

      return metaEvidence;
    } catch (err) {
      // handle error...
      console.warn("Failed to get the evidence:", err);
      return {
        metaEvidenceJSON: {
          description:
            "The data for this case is not formatted correctly or has been tampered since the time of its submission. Please refresh the page and refuse to arbitrate if the problem persists.",
          title: "Invalid or tampered case data, refuse to arbitrate.",
        },
      };
    }
  };

  const evidenceDisplayInterfaceURL = useMemo(() => {
    const normalizeIPFSUri = (uri) => uri.replace(/^\/ipfs\//, "https://ipfs.kleros.io/ipfs/");
    if (metaEvidence?.metaEvidenceJSON?.evidenceDisplayInterfaceURI) {
      const { evidenceDisplayInterfaceURI, _v = "0" } = metaEvidence.metaEvidenceJSON;
      const arbitratorChainID = metaEvidence.metaEvidenceJSON?.arbitratorChainID ?? 1;
      const arbitrableChainID = metaEvidence.metaEvidenceJSON?.arbitrableChainID ?? arbitratorChainID;

      let url = normalizeIPFSUri(evidenceDisplayInterfaceURI);

      const injectedParams = {
        disputeID: ID,
        chainID: 1, // Deprecated. Use arbitratorChainID and arbitrableChainID instead.
        arbitratorContractAddress: klerosLiquid.address,
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
  }, [metaEvidence, ID, dispute, klerosLiquid.address]);

  return (
    <>
      <StyledCard
        actions={[
          <Spin key="main" spinning={isLoading || !subcourts || !metaEvidence}>
            {!isLoading && subcourts && metaEvidence && disputeExtraInfo ? (
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
                      {votesDataObject?.currentRuling === "0"
                        ? "No arbitrar"
                        : (metaEvidence.metaEvidenceJSON.rulingOptions &&
                            realitioLibQuestionFormatter.getAnswerString(
                              {
                                decimals: metaEvidence.metaEvidenceJSON.rulingOptions.precision,
                                outcomes: metaEvidence.metaEvidenceJSON.rulingOptions.titles,
                                type: metaEvidence.metaEvidenceJSON.rulingOptions.type,
                              },
                              realitioLibQuestionFormatter.padToBytes32(
                                BigNumber.from(votesDataObject?.currentRuling).sub(BigNumber.from("1")).toString(16)
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
                  subcourt={subcourtObject}
                />
              </div>
              <Col span={24}>
                <StyledInnerCard actions={metaEvidenceActions}>
                  <ReactMarkdown source={metaEvidence.metaEvidenceJSON.description} />
                  {metaEvidence.metaEvidenceJSON.evidenceDisplayInterfaceURI && (
                    <iframe
                      title="dispute details"
                      style={{ width: "1px", minWidth: "100%", height: "auto", border: "none" }}
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
                ruling={dispute.period === "4" ? votesDataObject.currentRuling : null}
                chainId={1}
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
                    ruling={dispute.period === "4" ? votesDataObject.currentRuling : null}
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

const ArbitrableInterfaceDiv = styled.div`
  border-top: 1px solid #d09cff;
  font-size: 18px;
  padding: 20px 0px 5px 0px;

  a {
    color: #4d00b4;
  }
`;
