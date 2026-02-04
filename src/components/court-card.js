import { Button, Card, Col, Popconfirm, Row } from "antd";
import React, { useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import styled from "styled-components/macro";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { ReactComponent as Hexagon } from "../assets/images/hexagon.svg";
import { ReactComponent as Scales } from "../assets/images/scales.svg";
import { useDataloader, VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import rewardImg from "../assets/images/reward.png";
import stakeImg from "../assets/images/stake-kleros-logo.png";
import ETHAmount from "./eth-amount";

const { useDrizzle, useDrizzleState } = drizzleReactHooks;

const StyledCard = styled(Card).attrs({ className: "purple-header-card" })`
  border-radius: 12px;
  box-shadow: ${({ theme }) => theme.cardShadow};
  margin: 20px 0 0;
  text-align: center;

  .ant-card-actions {
    border: none;
    padding: 12px 0px;

    & > li {
      border: none;
    }

    button {
      font-size: 14px;
      height: 40px;
      min-width: 110px;
      border-radius: 3px;
    }
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
const StakeCol = styled(Col)`
  color: ${({ theme }) => theme.textPrimary};
  font-size: 14px;
  margin-top: 16px;
  text-align: left;

  h3 {
    color: ${({ theme }) => theme.textPrimary};
    font-size: 24px;
    font-weight: 600;
  }
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
const StakeBox = styled(InfoBox)`
  background: ${({ theme }) => theme.elevatedBackground};
`;
const RewardBox = styled(InfoBox)`
  background: linear-gradient(
    111.05deg,
    ${({ theme }) => theme.gradientStart} 45.17%,
    ${({ theme }) => theme.gradientEnd} 88.53%
  );
`;
const CourtCard = ({ ID, onClick, onStakeClick: _onStakeClick }) => {
  const { useCacheCall, useCacheSend } = useDrizzle();
  const drizzleState = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
  }));
  const loadPolicy = useDataloader.loadPolicy();
  let name;
  const policy = useCacheCall("PolicyRegistry", "policies", ID);
  if (policy !== undefined) {
    const policyJSON = loadPolicy(policy);
    if (policyJSON) name = policyJSON.name;
  }
  const stake = useCacheCall("KlerosLiquidExtraViews", "stakeOf", drizzleState.account, ID);
  const subcourt = useCacheCall("KlerosLiquid", "courts", ID);
  const { send, status } = useCacheSend("KlerosLiquid", "setStake");
  const onStakeClick = useCallback(
    (e) => {
      e.stopPropagation();
      _onStakeClick(ID);
    },
    [_onStakeClick, ID]
  );

  return (
    <StyledCard
      actions={useMemo(
        () => [
          <Popconfirm
            key="confirm"
            cancelText="No"
            okText="Yes"
            onCancel={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onConfirm={(e) => {
              e.stopPropagation();
              send(ID, 0);
            }}
            title="Unstake all of your PNK from this court?"
          >
            <Button className="ant-btn-secondary">Unstake All</Button>
          </Popconfirm>,
          <Button key="button" className="stake-button" onClick={onStakeClick} type="primary">
            Stake
          </Button>,
        ],
        [ID, onStakeClick, send]
      )}
      hoverable
      loading={name === undefined || (status && status !== "error")}
      onClick={useCallback(() => onClick(ID), [onClick, ID])}
      title={
        <>
          <Scales style={{ marginRight: "5px" }} />
          {name}
        </>
      }
    >
      <div>
        <StakeBox>
          <Row>
            <IconCol md={8} xs={8}>
              <Hexagon className="ternary-fill" />
              <StyledPrefixDiv>
                <img src={stakeImg} alt="stake" />
              </StyledPrefixDiv>
            </IconCol>
            <StakeCol md={16} xs={16}>
              <div>Current Stake</div>
              <h3>
                <ETHAmount amount={stake} decimals={0} tokenSymbol="PNK" />
              </h3>
            </StakeCol>
          </Row>
        </StakeBox>
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
                <ETHAmount amount={subcourt && subcourt.feeForJuror} decimals={3} tokenSymbol={true} />
              </h3>
            </RewardCol>
          </Row>
        </RewardBox>
      </div>
    </StyledCard>
  );
};

CourtCard.propTypes = {
  ID: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  onStakeClick: PropTypes.func.isRequired,
};

export default CourtCard;
