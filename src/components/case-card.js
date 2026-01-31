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
import useChainId from "../hooks/use-chain-id";
import Hint from "./hint";
import ETHAmount from "./eth-amount";

const { useDrizzle } = drizzleReactHooks;

const StyledCard = styled(Card)`
  border-radius: 12px;
  box-shadow: ${({ theme }) => theme.cardShadow};
  margin: 20px 0 0;
  text-align: center;
  background: ${({ theme }) => theme.cardBackground};

  .ant-card-actions {
    background: ${({ theme }) => theme.cardActionsBackground};
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
      border: 1px solid ${({ theme }) => theme.primaryPurple};
      border-radius: 3px;
      color: ${({ theme }) => theme.primaryPurple};
    }
  }

  .ant-card-head {
    background: ${({ theme }) => theme.cardHeaderBackground};
    border-top-left-radius: 12px;
    border-top-right-radius: 12px;
    color: ${({ theme }) => theme.textOnPurple};
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
  color: ${({ theme }) => theme.textOnPurple};
  font-size: 14px;
  margin-top: 16px;
  text-align: left;

  h3 {
    color: ${({ theme }) => theme.textOnPurple};
    font-size: 24px;
    font-weight: 600;
  }
`;
const InfoBox = styled.div`
  border: 2px solid ${({ theme }) => theme.borderColor};
  border-radius: 12px;
  height: 88px;
  margin-bottom: 8px;
`;
const CaseTitleBox = styled.div`
  color: ${({ theme }) => theme.textSecondary};
  font-size: 20px;
  font-weight: 500;
  height: 65px;
  line-height: 23px;
`;
const RewardBox = styled(InfoBox)`
  background: linear-gradient(
    111.05deg,
    ${({ theme }) => theme.gradientStart} 45.17%,
    ${({ theme }) => theme.gradientEnd} 88.53%
  );
`;
const StyledHeaderText = styled.div`
  color: ${({ theme }) => theme.textOnPurple};
  display: inline-block;
  font-size: 14px;
  font-weight: 500;
  line-height: 16px;
  position: relative;
  top: -2px;
`;
const TimeoutDiv = styled.div`
  color: ${({ isVoteCommitted, theme }) => (isVoteCommitted ? theme.successColor : theme.dangerColor)};
`;

const TimeoutDivIsCommited = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;

  @media (max-width: 460px) {
    flex-direction: column;
  }
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
  color: ${({ theme }) => theme.textPrimary};
  font-size: 14px;
  line-height: 16px;
  text-align: right;
`;

const phases = ["Evidence Submission", "Commit Deadline", "Voting Deadline", "Appeal Deadline", "Execute Deadline"];

const PeriodCard = ({ period, deadline, hiddenVotes, isVoteCommitted }) => {
  const showCommited = useMemo(() => Number(period) === 1 && isVoteCommitted, [period, isVoteCommitted]);
  const periodText = useMemo(() => {
    const showRevealDeadline = Number(period) === 2 && hiddenVotes;

    if (showRevealDeadline) {
      return "Reveal Deadline";
    } else if (showCommited) {
      return "Committed ✅";
    } else {
      return phases[period];
    }
  }, [showCommited, period, hiddenVotes]);

  return (
    <TimeoutDiv isVoteCommitted={isVoteCommitted} key="timeout">
      <TimeoutText>{periodText}</TimeoutText>
      <TimeoutTime>
        {showCommited ? (
          <TimeoutDivIsCommited>
            Reveal&nbsp;<TimeAgo>{deadline}</TimeAgo>
          </TimeoutDivIsCommited>
        ) : (
          <TimeAgo>{deadline}</TimeAgo>
        )}
      </TimeoutTime>
    </TimeoutDiv>
  );
};

const CaseCard = ({ ID, draws, isVoteCommitted }) => {
  const chainId = useChainId();
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
        acc[d.appeal] = acc[d.appeal] ? acc[d.appeal].add(drizzle.web3.utils.toBN(1)) : drizzle.web3.utils.toBN(1);
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
        const court = call("KlerosLiquid", "courts", dispute.subcourtID);
        if (subcourt)
          disputeData.deadline = new Date(
            (Number(dispute.lastPeriodChange) + Number(subcourt.timesPerPeriod[dispute.period])) * 1000
          );
        if (court) {
          disputeData.hiddenVotes = court.hiddenVotes;
        }
      }
    }
    return disputeData;
  });

  const metaEvidence =
    dispute && getMetaEvidence(chainId, dispute.arbitrated, drizzle.contracts.KlerosLiquid.address, ID);

  return (
    <StyledCard
      actions={useMemo(
        () => [
          disputeData.deadline && (
            <PeriodCard
              period={dispute.period}
              deadline={disputeData.deadline}
              hiddenVotes={disputeData.hiddenVotes}
              isVoteCommitted={isVoteCommitted}
            />
          ),
          <Link key="details" to={`/cases/${ID}`}>
            <Button type="primary">See Details</Button>
          </Link>,
        ],
        [disputeData.deadline, dispute.period, disputeData.hiddenVotes, ID, isVoteCommitted]
      )}
      extra={<StyledHeaderText>Case #{ID}</StyledHeaderText>}
      hoverable
      loading={!metaEvidence}
      title={
        <>
          <Scales style={{ marginRight: "5px" }} />
          <StyledHeaderText>{metaEvidence?.category}</StyledHeaderText>
        </>
      }
    >
      <div>
        <CaseTitleBox>{metaEvidence?.title}</CaseTitleBox>
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
                <ETHAmount amount={disputeData && disputeData.coherenceReward} decimals={3} tokenSymbol={true} />
              </h3>
            </RewardCol>
          </Row>
        </RewardBox>
        <StakeLocked>
          Stake locked: <ETHAmount amount={disputeData && disputeData.atStake} decimals={0} tokenSymbol="PNK" />{" "}
          <Hint
            title="Locked Tokens"
            description="These are the tokens you have locked for the duration of the dispute."
          />
        </StakeLocked>
      </div>
    </StyledCard>
  );
};

PeriodCard.propTypes = {
  period: PropTypes.number.isRequired,
  deadline: PropTypes.number.isRequired,
  hiddenVotes: PropTypes.bool.isRequired,
  isVoteCommitted: PropTypes.bool,
};

CaseCard.propTypes = {
  ID: PropTypes.string.isRequired,
  draws: PropTypes.array,
  isVoteCommitted: PropTypes.bool,
};

export default CaseCard;
