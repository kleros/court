import React, { useMemo } from "react";
import { Row, Col } from "antd";
import { useParams } from "react-router-dom";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import CaseDetailsCard from "../components/case-details-card";
import TimeAgo from "../components/time-ago";
import TopBanner from "../components/top-banner";
import RequiredChainIdGateway from "../components/required-chain-id-gateway";
import RequiredChainIdModal from "../components/required-chain-id-modal";
import styled from "styled-components/macro";
import { VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";

const { useDrizzle, useDrizzleState } = drizzleReactHooks;

const MANUAL_PASS_DELAY = 3600;

const periodToPhase = (period, hiddenVotes) => {
  const phases = ["Evidencia", "Commit", "Votación", "Apelación", "Ejecución"];
  const phase = Number(period) === 2 && hiddenVotes ? "Reveal" : phases[period];
  return phase;
};

export default function Case() {
  const { ID } = useParams();
  const { drizzle, useCacheCall, useCacheEvents } = useDrizzle();
  const drizzleState = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
  }));
  const dispute = useCacheCall("KlerosLiquid", "disputes", ID);
  const dispute2 = useCacheCall("KlerosLiquid", "getDispute", ID);
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
  const disputeData = useCacheCall(["KlerosLiquid"], (call) => {
    let disputeData = {};
    if (dispute2 && draws) {
      const tokensAtStakePerJuror = dispute2.tokensAtStakePerJuror.map(drizzle.web3.utils.toBN);
      const votesByAppeal = draws.reduce((acc, d) => {
        acc[d.returnValues._appeal] = acc[d.returnValues._appeal]
          ? acc[d.returnValues._appeal].add(drizzle.web3.utils.toBN(1))
          : drizzle.web3.utils.toBN(1);
        return acc;
      }, {});
      disputeData = Object.keys(votesByAppeal).reduce(
        (acc, a) => {
          acc.atStake = acc.atStake.add(votesByAppeal[a].mul(tokensAtStakePerJuror[a]));
          return acc;
        },
        {
          atStake: drizzle.web3.utils.toBN(0),
          deadline: undefined,
        }
      );
      if (dispute && !dispute.ruled) {
        const subcourt = call("KlerosLiquid", "getSubcourt", dispute.subcourtID);
        const court = call("KlerosLiquid", "courts", dispute.subcourtID);
        if (subcourt) {
          disputeData.deadline =
            dispute.period < 4
              ? new Date((Number(dispute.lastPeriodChange) + Number(subcourt.timesPerPeriod[dispute.period])) * 1000)
              : null;
          disputeData.showPassPeriod =
            dispute.period < 4
              ? parseInt(new Date().getTime() / 1000) - Number(dispute.lastPeriodChange) >
                Number(subcourt.timesPerPeriod[dispute.period]) + MANUAL_PASS_DELAY
              : true;
        }
        if (court) {
          disputeData.hiddenVotes = court.hiddenVotes;
        }
      }
    }
    return disputeData;
  });

  return (
    <RequiredChainIdGateway
      renderOnMismatch={({ requiredChainId }) => <RequiredChainIdModal requiredChainId={requiredChainId} />}
    >
      <TopBanner
        description={<> Caso #{ID} </>}
        extra={
          <Row>
            {(dispute && dispute.period > 2) || (dispute2 && dispute2.votesLengths.length > 1) ? (
              <ResolvedTag>Resuelto</ResolvedTag>
            ) : (
              <>
                {disputeData.deadline && disputeData.hiddenVotes !== undefined && (
                  <Col lg={disputeData.showPassPeriod ? 12 : 24}>
                    <StyledDiv>Fin del periodo de {periodToPhase(dispute.period, disputeData.hiddenVotes)}:</StyledDiv>
                    <StyledBigTextDiv>
                      <TimeAgo className="primary-color theme-color">{disputeData.deadline}</TimeAgo>
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
    </RequiredChainIdGateway>
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
