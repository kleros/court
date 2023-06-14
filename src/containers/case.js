import { useConfig } from "@usedapp/core";
import { Col, Row } from "antd";
import { BigNumber } from "ethers";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components/macro";
import CaseDetailsCard from "../components/case-details-card";
import TimeAgo from "../components/time-ago";
import TopBanner from "../components/top-banner";
import useContract from "../hooks/use-contract";

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
      await getDispute();
      await getDisputeExtraInfo();
      await getDraws();
      await getDisputeData();
    };

    fetchData().catch(console.error);
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

  const getTokensAtStakePerJuror = (disputeExtraInfo) => {
    return disputeExtraInfo.tokensAtStakePerJuror.map((juror) => {
      return juror;
    });
  };

  const getVotesByAppeal = (draws) => {
    return draws.reduce((acc, d) => {
      acc[d.returnValues._appeal] = acc[d.returnValues._appeal]
        ? acc[d.returnValues._appeal].add(BigNumber.from(1))
        : BigNumber.from(1);
      return acc;
    }, {});
  };

  const shouldShowPassPeriod = (dispute, subcourt) => {
    return dispute.period < 4
      ? parseInt(new Date().getTime() / 1000) - Number(dispute.lastPeriodChange) >
          Number(subcourt.timesPerPeriod[dispute.period]) + MANUAL_PASS_DELAY
      : true;
  };

  const getDisputeDeadline = (dispute, subcourt) => {
    return dispute.period < 4
      ? new Date((Number(dispute.lastPeriodChange) + Number(subcourt.timesPerPeriod[dispute.period])) * 1000)
      : null;
  };

  const calculateAtStake = (votesByAppeal, tokensAtStakePerJuror) => {
    return Object.keys(votesByAppeal).reduce(
      (acc, a) => {
        acc.atStake = acc.atStake.add(votesByAppeal[a].mul(tokensAtStakePerJuror[a]));
        return acc;
      },
      {
        atStake: BigNumber.from(0),
        deadline: undefined,
      }
    );
  };

  const getDisputeData = async () => {
    let disputeData = {};
    if (caseData.disputeExtraInfo && caseData.draws) {
      const tokensAtStakePerJuror = getTokensAtStakePerJuror(caseData.disputeExtraInfo);
      const votesByAppeal = getVotesByAppeal(caseData.draws);
      disputeData = calculateAtStake(votesByAppeal, tokensAtStakePerJuror);

      if (caseData.dispute && !caseData.dispute.ruled) {
        const subcourt = await klerosLiquid.getSubcourt(caseData.dispute.subcourtID);
        const court = await klerosLiquid.courts(caseData.dispute.subcourtID);

        disputeData.deadline = getDisputeDeadline(caseData.dispute, subcourt);
        disputeData.showPassPeriod = shouldShowPassPeriod(caseData.dispute, subcourt);
        if (court) {
          disputeData.hiddenVotes = court.hiddenVotes;
        }
      }
    }
    setCaseData((oldData) => ({ ...oldData, disputeData: disputeData }));
    return disputeData;
  };

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
