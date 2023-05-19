import { Row } from "antd";
import React from "react";
import { useParams } from "react-router-dom";
import CaseDetailsCard from "../components/case-details-card";
import RequiredChainIdGateway from "../components/required-chain-id-gateway";
import RequiredChainIdModal from "../components/required-chain-id-modal";
import TopBanner from "../components/top-banner";

// const periodToPhase = (period, hiddenVotes) => {
//   const phases = ["Evidencia", "Commit", "Votación", "Apelación", "Ejecución"];
//   const phase = Number(period) === 2 && hiddenVotes ? "Reveal" : phases[period];
//   return phase;
// };

export default function Case() {
  const { ID } = useParams();
  // const drizzleState = useDrizzleState((drizzleState) => ({
  //   account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
  // }));

  // const { klerosLiquid } = useContract({ chainID: 1 });

  // console.log("🚀 ~ file: case.js:29 ~ Case ~ klerosLiquid:", klerosLiquid);

  // const klerosDisputes = usePromise(React.useCallback(() => klerosLiquid.getDispute(ID), [ID]));
  // const account = provider.listAccounts();
  // console.log("🚀 ~ file: case.js:29 ~ Case ~ klerosDispute:", klerosDisputes);
  // const klerosDispute = klerosLiquid.dispute(ID);
  // const { drizzle, useCacheCall, useCacheEvents } = useDrizzle();
  // const dispute = useCacheCall("KlerosLiquid", "disputes", ID);
  // const dispute2 = useCacheCall("KlerosLiquid", "getDispute", ID);
  // const draws = useCacheEvents(
  //   "KlerosLiquid",
  //   "Draw",
  //   useMemo(
  //     () => ({
  //       filter: { _address: account[0], _disputeID: ID },
  //       fromBlock: process.env.REACT_APP_KLEROS_LIQUID_BLOCK_NUMBER,
  //     }),
  //     [account[0], ID]
  //   )
  // );

  // const filter = klerosLiquid.filters.Draw();

  // const events = usePromise(
  //   React.useCallback(
  //     () => klerosLiquid.queryFilter(filter, parseInt(process.env.REACT_APP_KLEROS_LIQUID_BLOCK_NUMBER)),
  //     [ID]
  //   )
  // );
  // console.log("🚀 ~ file: case.js:65 ~ Case ~ events:", events);

  // console.log("🚀 ~ file: case.js:52 ~ Case ~ latestBlock:", latestBlock);

  // const disputeData = useCacheCall(["KlerosLiquid"], (call) => {
  //   let disputeData = {};
  //   if (dispute2 && draws) {
  //     const tokensAtStakePerJuror = klerosDisputes.tokensAtStakePerJuror.map((juror) => {
  //       return juror;
  //     });
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

  return (
    <RequiredChainIdGateway
      renderOnMismatch={({ requiredChainId }) => <RequiredChainIdModal requiredChainId={requiredChainId} />}
    >
      <TopBanner
        description={<> Caso #{ID} </>}
        extra={
          <Row>
            {/* {(dispute && dispute.period > 2) || (dispute2 && dispute2.votesLengths.length > 1) ? (
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
            )} */}
          </Row>
        }
        title="Detalles del Caso"
      />
      <CaseDetailsCard ID={ID} />
    </RequiredChainIdGateway>
  );
}

// const StyledDiv = styled.div`
//   font-weight: bold;
// `;

// const StyledBigTextDiv = styled(StyledDiv)`
//   font-size: 20px;
// `;

// const ResolvedTag = styled.div`
//   border: 1px solid;
//   border-radius: 3px;
//   float: right;
//   margin-right: 50px;
//   padding: 5px;
//   text-align: center;
//   width: 80px;
// `;
