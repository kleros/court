import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { Button, Card, Col, Row } from "antd";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import TimeAgo from "./time-ago";
import styled from "styled-components/macro";
import rewardImg from "../assets/images/reward.png";
import { ReactComponent as Hexagon } from "../assets/images/hexagon.svg";
import { ReactComponent as Scales } from "../assets/images/scales.svg";
import { useDataloader } from "../bootstrap/dataloader";
import Hint from "./hint";
import ETHAmount from "./eth-amount";

const { useDrizzle } = drizzleReactHooks;

const StyledCard = styled(Card)`
  border-radius: 12px;
  box-shadow: 0px 6px 36px #bc9cff;
  margin: 20px 0 0;
  text-align: center;

  .ant-card-actions {
    background: #f5f1fd;
    border: none;
    padding: 12px 24px;

    & > li {
      border: none;
    }

    & > li:first-child {
      span {
        float: left;
      }
    }
    & > li:nth-child(2) {
      span {
        float: right;
      }
    }

    button {
      font-size: 14px;
      height: 40px;
      min-width: 110px;
    }

    .unstake-button {
      background: none;
      border: 1px solid #4d00b4;
      border-radius: 3px;
      color: #4d00b4;
    }
  }

  .ant-card-head {
    background: #4d00b4;
    border-top-left-radius: 12px;
    border-top-right-radius: 12px;
    color: white;
    height: 40px;
    text-align: left;
  }
`;
const StyledPrefixDiv = styled.div`
  left: 50%;
  position: absolute;
  top: 33px;
  transform: translate(-50%, -50%);
`;
const IconCol = styled(Col)`
  margin-top: 10px;
`;
const RewardCol = styled(Col)`
  color: white;
  font-size: 14px;
  margin-top: 16px;
  text-align: left;

  h3 {
    color: white;
    font-size: 24px;
    font-weight: 600;
  }
`;
const InfoBox = styled.div`
  border: 2px solid #d09cff;
  border-radius: 12px;
  height: 88px;
  margin-bottom: 8px;
`;
const CaseTitleBox = styled.div`
  color: #000000;
  font-size: 20px;
  font-weight: 500;
  height: 65px;
  line-height: 23px;
`;
const RewardBox = styled(InfoBox)`
  background: linear-gradient(111.05deg, #4d00b4 45.17%, #6500b4 88.53%);
`;
const StyledHeaderText = styled.div`
  color: #ffffff;
  display: inline-block;
  font-size: 14px;
  font-weight: 500;
  line-height: 16px;
  position: relative;
  top: -2px;
`;
const TimeoutDiv = styled.div`
  color: #f60c36;
`;
const TimeoutText = styled.div`
  font-size: 14px;
  font-weight: 500;
  line-height: 16px;
  text-align: center;
`;
const TimeoutTime = styled.div`
  font-size: 20px;
  font-weight: bold;
  line-height: 23px;
  text-align: center;
`;
const StakeLocked = styled.div`
  color: #4d00b4;
  font-size: 14px;
  line-height: 16px;
  text-align: right;
`;
const CaseCard = ({ ID, draws }) => {
  const { drizzle, useCacheCall } = useDrizzle();
  const getMetaEvidence = useDataloader.getMetaEvidence();
  const dispute = useCacheCall("KlerosLiquid", "disputes", ID);
  const dispute2 = useCacheCall("KlerosLiquid", "getDispute", ID);

  const disputeData = useCacheCall(["KlerosLiquid"], (call) => {
    let disputeData = {};
    if (dispute2 && draws) {
      const votesLengths = dispute2.votesLengths.map(drizzle.web3.utils.toBN);
      const tokensAtStakePerJuror = dispute2.tokensAtStakePerJuror.map(drizzle.web3.utils.toBN);
      const totalFeesForJurors = dispute2.totalFeesForJurors.map(drizzle.web3.utils.toBN);
      const votesByAppeal = draws.reduce((acc, d) => {
        acc[d.returnValues._appeal] = acc[d.returnValues._appeal]
          ? acc[d.returnValues._appeal].add(drizzle.web3.utils.toBN(1))
          : drizzle.web3.utils.toBN(1);
        return acc;
      }, {});
      disputeData = Object.keys(votesByAppeal).reduce(
        (acc, a) => {
          acc.atStake = acc.atStake.add(votesByAppeal[a].mul(tokensAtStakePerJuror[a]));
          acc.coherenceReward = acc.coherenceReward.add(
            votesByAppeal[a].mul(totalFeesForJurors[a]).div(votesLengths[a])
          );
          return acc;
        },
        {
          atStake: drizzle.web3.utils.toBN(0),
          coherenceReward: drizzle.web3.utils.toBN(0),
          deadline: undefined,
        }
      );
      if (dispute && dispute.period !== "4" && votesByAppeal[votesLengths.length - 1]) {
        const subcourt = call("KlerosLiquid", "getSubcourt", dispute.subcourtID);
        if (subcourt)
          disputeData.deadline = new Date(
            (Number(dispute.lastPeriodChange) + Number(subcourt.timesPerPeriod[dispute.period])) * 1000
          );
      }
    }
    return disputeData;
  });
  let metaEvidence;
  if (dispute) {
    if (dispute.ruled) {
      metaEvidence = getMetaEvidence(dispute.arbitrated, drizzle.contracts.KlerosLiquid.address, ID, {
        strictHashes: false,
      });
    } else {
      metaEvidence = getMetaEvidence(dispute.arbitrated, drizzle.contracts.KlerosLiquid.address, ID);
    }
  }
  return (
    <StyledCard
      actions={useMemo(
        () => [
          disputeData.deadline && (
            <TimeoutDiv key="timeout">
              <TimeoutText>
                {
                  ["Evidence Submission", "Commit Deadline", "Voting Deadline", "Appeal Deadline", "Execute Deadline"][
                    dispute.period
                  ]
                }
              </TimeoutText>
              <TimeoutTime>
                <TimeAgo>{disputeData.deadline}</TimeAgo>
              </TimeoutTime>
            </TimeoutDiv>
          ),
          <Link key="details" to={`/cases/${ID}`}>
            <Button type="primary">See Details</Button>
          </Link>,
        ],
        [disputeData.deadline, dispute.period, ID]
      )}
      extra={<StyledHeaderText>Case #{ID}</StyledHeaderText>}
      hoverable
      loading={!metaEvidence}
      title={
        <>
          <Scales style={{ marginRight: "5px" }} />
          <StyledHeaderText>{metaEvidence && metaEvidence.metaEvidenceJSON.category}</StyledHeaderText>
        </>
      }
    >
      <div>
        <CaseTitleBox>{metaEvidence && metaEvidence.metaEvidenceJSON.title}</CaseTitleBox>
        <RewardBox>
          <Row>
            <IconCol md={8} xs={8}>
              <Hexagon className="ternary-fill" />
              <StyledPrefixDiv>
                <img src={rewardImg} alt="reward" />
              </StyledPrefixDiv>
            </IconCol>
            <RewardCol md={16} xs={16}>
              <div>Coherence Reward</div>
              <h3>
                <ETHAmount amount={disputeData && disputeData.coherenceReward} decimals={2} tokenSymbol={true} /> +
              </h3>
            </RewardCol>
          </Row>
        </RewardBox>
        <StakeLocked>
          Stake locked: <ETHAmount amount={disputeData && disputeData.atStake} decimals={2} tokenSymbol="PNK" />{" "}
          <Hint
            title="Locked Tokens"
            description="These are the tokens you have locked for the duration of the dispute."
          />
        </StakeLocked>
      </div>
    </StyledCard>
  );
};

CaseCard.propTypes = {
  ID: PropTypes.string.isRequired,
  draws: PropTypes.array,
};

export default CaseCard;
