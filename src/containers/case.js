import React, { useState, useEffect } from "react";
import { Row, Col } from "antd";
import { useParams } from "react-router-dom";
import CaseDetailsCard from "../components/case-details-card";
import TopBanner from "../components/top-banner";
import TimeAgo from "../components/time-ago";
import styled from "styled-components/macro";
import useContract from "../hooks/use-contract";
import { BigNumber } from "ethers";
import { useConfig } from "@usedapp/core";

const MANUAL_PASS_DELAY = 3600;

const periodToPhase = (period, hiddenVotes) => {
  const phases = ["Evidencia", "Commit", "Votación", "Apelación", "Ejecución"];
  const phase = Number(period) === 2 && hiddenVotes ? "Reveal" : phases[period];
  return phase;
};

export default function Case() {
  const config = useConfig();
  const { ID } = useParams();
  const { klerosLiquid } = useContract({ chainID: config.readOnlyChainId });
  const [caseData, setCaseData] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      const dispute = await getDispute();
      const disputeExtraInfo = await getDisputeExtraInfo();
      const draws = await getDraws();
      await getDisputeData(dispute, disputeExtraInfo, draws);
    };

    fetchData();
  }, [ID]);

  const getDispute = async () => {
    try {
      const dispute = await klerosLiquid.disputes(ID);
      setCaseData((oldData) => ({ ...oldData, dispute: dispute }));
      return dispute;
    } catch (err) {
      console.error(err);
    }
  };

  const getDisputeExtraInfo = async () => {
    try {
      const disputeExtraInfo = await klerosLiquid.getDispute(ID);
      setCaseData((oldData) => ({ ...oldData, disputeExtraInfo: disputeExtraInfo }));
      return disputeExtraInfo;
    } catch (err) {
      console.error(err);
    }
  };

  const getDraws = async () => {
    const filter = klerosLiquid.filters.Draw();
    try {
      const draws = await klerosLiquid.queryFilter(filter, parseInt(process.env.REACT_APP_KLEROS_LIQUID_BLOCK_NUMBER));
      setCaseData((oldData) => ({ ...oldData, draws: draws }));
      return draws;
    } catch (err) {
      console.error(err);
    }
  };

  const getDisputeData = async () => {
    let disputeData = {};
    if (caseData.disputeExtraInfo && caseData.draws) {
      const tokensAtStakePerJuror = caseData.disputeExtraInfo.tokensAtStakePerJuror.map((juror) => {
        return juror;
      });
      const votesByAppeal = caseData.draws.reduce((acc, d) => {
        acc[d.returnValues._appeal] = acc[d.returnValues._appeal]
          ? acc[d.returnValues._appeal].add(BigNumber.from(1))
          : BigNumber.from(1);
        return acc;
      }, {});
      disputeData = Object.keys(votesByAppeal).reduce(
        (acc, a) => {
          acc.atStake = acc.atStake.add(votesByAppeal[a].mul(tokensAtStakePerJuror[a]));
          return acc;
        },
        {
          atStake: BigNumber.from(0),
          deadline: undefined,
        }
      );
      if (caseData.dispute && !caseData.dispute.ruled) {
        const subcourt = await klerosLiquid.getSubcourt(caseData.dispute.subcourtID);
        const court = await klerosLiquid.courts(caseData.dispute.subcourtID);
        if (subcourt) {
          disputeData.deadline =
            caseData.dispute.period < 4
              ? new Date(
                  (Number(caseData.dispute.lastPeriodChange) +
                    Number(subcourt.timesPerPeriod[caseData.dispute.period])) *
                    1000
                )
              : null;
          disputeData.showPassPeriod =
            caseData.dispute.period < 4
              ? parseInt(new Date().getTime() / 1000) - Number(caseData.dispute.lastPeriodChange) >
                Number(subcourt.timesPerPeriod[caseData.dispute.period]) + MANUAL_PASS_DELAY
              : true;
        }
        if (court) {
          disputeData.hiddenVotes = court.hiddenVotes;
        }
      }
    }
    setCaseData((oldData) => ({ ...oldData, disputeData: disputeData }));
    return disputeData;
  };

  // const disputeData = useCacheCall(["KlerosLiquid"], (call) => {
  //   let disputeData = {};
  //   if (dispute2 && draws) {
  //     const tokensAtStakePerJuror = dispute2.tokensAtStakePerJuror.map(drizzle.web3.utils.toBN);
  //     const votesByAppeal = draws.reduce((acc, d) => {
  //       acc[d.returnValues._appeal] = acc[d.returnValues._appeal]
  //         ? acc[d.returnValues._appeal].add(drizzle.web3.utils.toBN(1))
  //         : drizzle.web3.utils.toBN(1);
  //       return acc;
  //     }, {});
  //     disputeData = Object.keys(votesByAppeal).reduce(
  //       (acc, a) => {
  //         acc.atStake = acc.atStake.add(votesByAppeal[a].mul(tokensAtStakePerJuror[a]));
  //         return acc;
  //       },
  //       {
  //         atStake: drizzle.web3.utils.toBN(0),
  //         deadline: undefined,
  //       }
  //     );
  //     if (dispute && !dispute.ruled) {
  //       const subcourt = call("KlerosLiquid", "getSubcourt", dispute.subcourtID);
  //       const court = call("KlerosLiquid", "courts", dispute.subcourtID);
  //       if (subcourt) {
  //         disputeData.deadline =
  //           dispute.period < 4
  //             ? new Date((Number(dispute.lastPeriodChange) + Number(subcourt.timesPerPeriod[dispute.period])) * 1000)
  //             : null;
  //         disputeData.showPassPeriod =
  //           dispute.period < 4
  //             ? parseInt(new Date().getTime() / 1000) - Number(dispute.lastPeriodChange) >
  //               Number(subcourt.timesPerPeriod[dispute.period]) + MANUAL_PASS_DELAY
  //             : true;
  //       }
  //       if (court) {
  //         disputeData.hiddenVotes = court.hiddenVotes;
  //       }
  //     }
  //   }
  //   return disputeData;
  // });

  console.log("dispute on case linea 87", caseData?.dispute);
  console.log("dispute2 on case linea 88", caseData?.dispute2);
  console.log("draws on case linea 89", caseData?.draws);
  console.log("disputedata", caseData?.disputeData);

  return (
    <>
      <TopBanner
        description={<> Caso #{ID} </>}
        extra={
          <Row>
            {(caseData.dispute && caseData.dispute.period > 2) ||
            (caseData.dispute2 && caseData.dispute2.votesLengths?.length > 1) ? (
              <ResolvedTag>Resuelto</ResolvedTag>
            ) : (
              <>
                {caseData.disputeData?.deadline && caseData.disputeData?.hiddenVotes !== undefined && (
                  <Col lg={caseData.disputeData.showPassPeriod ? 12 : 24}>
                    <StyledDiv>
                      Fin del periodo de {periodToPhase(caseData.dispute.period, caseData.disputeData.hiddenVotes)}:
                    </StyledDiv>
                    <StyledBigTextDiv>
                      <TimeAgo className="primary-color theme-color">{caseData.disputeData.deadline}</TimeAgo>
                    </StyledBigTextDiv>
                  </Col>
                )}
              </>
            )}
          </Row>
        }
        title="Detalles del Caso"
      />
      <CaseDetailsCard ID={ID} />
    </>
  );
}

const StyledDiv = styled.div`
  font-weight: bold;
`;

const StyledBigTextDiv = styled(StyledDiv)`
  font-size: 20px;
`;

const ResolvedTag = styled.div`
  border: 1px solid;
  border-radius: 3px;
  float: right;
  margin-right: 50px;
  padding: 5px;
  text-align: center;
  width: 80px;
`;
