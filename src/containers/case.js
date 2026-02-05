import React, { useEffect, useMemo, useState } from "react";
import { Button, Modal, Row, Col, Tooltip } from "antd";
import { useParams } from "react-router-dom";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import CaseDetailsCard from "../components/case-details-card.jsx";
import ETHAmount from "../components/eth-amount";
import TimeAgo from "../components/time-ago";
import TopBanner from "../components/top-banner";
import RequiredChainIdGateway from "../components/required-chain-id-gateway";
import RequiredChainIdModal from "../components/required-chain-id-modal";
import styled from "styled-components/macro";
import { VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import useChainId from "../hooks/use-chain-id";
import useGetDraws from "../hooks/use-get-draws";
import { chainIdToNetworkName } from "../helpers/networks";
import C404 from "./404";

const { useDrizzle, useDrizzleState } = drizzleReactHooks;

const MANUAL_PASS_DELAY = 3600;

const periodToPhase = (period, hiddenVotes) => {
  const phases = ["Evidence", "Commit", "Vote", "Appeal", "Execute"];
  const phase = Number(period) === 2 && hiddenVotes ? "Reveal" : phases[period];
  return phase;
};

export default function Case() {
  const { ID } = useParams();
  const { drizzle, useCacheCall, useCacheSend } = useDrizzle();
  const drizzleState = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
  }));

  //Do what was done in app.js loadable() here, so we can avoid using a fallback drizzle there
  const [error, setError] = useState(null);

  useEffect(() => {
    //Avoid setting state after component is unmounted
    let mounted = true;

    (async () => {
      try {
        await drizzle.contracts.KlerosLiquid.methods.disputes(ID).call();
      } catch (err) {
        if (mounted) setError(err);
      }
    })();

    return () => (mounted = false);
  }, [drizzle, ID]);
  //----

  const { send: sendPassPeriod } = useCacheSend("KlerosLiquid", "passPeriod");
  const { send: sendExecuteRuling } = useCacheSend("KlerosLiquid", "executeRuling");
  const dispute = useCacheCall("KlerosLiquid", "disputes", ID);
  const dispute2 = useCacheCall("KlerosLiquid", "getDispute", ID);
  const chainId = useChainId();
  const draws = useGetDraws(chainId, `address: "${drizzleState.account}", disputeID: ${ID}`);

  const disputeData = useCacheCall(["KlerosLiquid"], (call) => {
    let disputeData = {};
    if (dispute2 && draws) {
      const tokensAtStakePerJuror = dispute2.tokensAtStakePerJuror.map(drizzle.web3.utils.toBN);
      const votesByAppeal = draws.reduce((acc, d) => {
        acc[d.appeal] = acc[d.appeal] ? acc[d.appeal].add(drizzle.web3.utils.toBN(1)) : drizzle.web3.utils.toBN(1);
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

  const isDisputeTooOld = useMemo(() => {
    return (
      disputeData.deadline && new Date().getTime() - disputeData.deadline.getTime() > 30 * 365 * 24 * 60 * 60 * 1000
    );
  }, [disputeData.deadline]);

  //Fallback to the 404 like the loadable() in app.js used to do
  if (error) return <C404 />;

  async function handleChainSwitchToMainnet() {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x1" }],
      });
    } catch (error) {
      console.error("Error switching chains:", error);
    }
  }

  const renderContent = () => {
    if (isDisputeTooOld && chainId !== 1) {
      return (
        <Modal
          title="Dispute Not Found"
          visible={true}
          closable={false}
          footer={[
            <Button key="switch" type="primary" onClick={handleChainSwitchToMainnet}>
              Switch to Mainnet
            </Button>,
          ]}
        >
          <p>
            The dispute with ID {ID} does not exist on {chainIdToNetworkName[chainId]}. Please switch to Mainnet.
          </p>
        </Modal>
      );
    }

    return (
      <>
        <TopBanner
          description={
            <>
              Case #{ID} | <ETHAmount amount={disputeData.atStake} tokenSymbol="PNK" /> Locked
            </>
          }
          extra={
            <Row>
              {dispute && dispute.ruled ? (
                <ResolvedTag>Resolved</ResolvedTag>
              ) : (
                <>
                  {disputeData.deadline && disputeData.hiddenVotes !== undefined && (
                    <Col lg={disputeData.showPassPeriod ? 12 : 24}>
                      <StyledDiv>{periodToPhase(dispute.period, disputeData.hiddenVotes)} Period Over</StyledDiv>
                      <StyledBigTextDiv>
                        <TimeAgo className="primary-color theme-color">{disputeData.deadline}</TimeAgo>
                      </StyledBigTextDiv>
                    </Col>
                  )}
                  {disputeData.showPassPeriod ? (
                    <Col lg={12}>
                      {Number(dispute.period) === 4 ? (
                        <Tooltip title={"Enforce the ruling of this case"}>
                          <StyledButton
                            type="primary"
                            onClick={() => {
                              sendExecuteRuling(ID);
                            }}
                          >
                            Execute Ruling
                          </StyledButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title={"Advance this case to the next phase"}>
                          <StyledButton
                            type="primary"
                            onClick={() => {
                              sendPassPeriod(ID);
                            }}
                          >
                            Pass Period
                          </StyledButton>
                        </Tooltip>
                      )}
                    </Col>
                  ) : (
                    ""
                  )}
                </>
              )}
            </Row>
          }
          title="Case Details"
        />
        <CaseDetailsCard ID={ID} />
      </>
    );
  };

  return (
    <RequiredChainIdGateway
      renderOnMismatch={({ requiredChainId }) => <RequiredChainIdModal requiredChainId={requiredChainId} />}
    >
      {renderContent()}
    </RequiredChainIdGateway>
  );
}

const StyledDiv = styled.div`
  font-weight: bold;
`;

const StyledBigTextDiv = styled(StyledDiv)`
  font-size: 20px;
`;

const StyledButton = styled(Button)`
  flex: 0 0 35%;
  margin: 15px 5px 0px;
`;

const ResolvedTag = styled.div`
  border: 1px solid ${({ theme }) => theme.primaryPurple};
  color: ${({ theme }) => theme.primaryPurple};
  border-radius: 3px;
  float: right;
  margin-right: 50px;
  padding: 5px;
  text-align: center;
  width: 80px;
`;
