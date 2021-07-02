import React, { useCallback, useState } from "react";
import styled from "styled-components/macro";
import { Link } from "react-router-dom";
import { Button, Col, Divider, Row, Spin } from "antd";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import AlternativeChainCourt from "../components/alternative-chain-court";
import CourtCard from "../components/court-card";
import CourtCascaderModal from "../components/court-cascader-modal";
import CourtDrawer from "../components/court-drawer";
import PNKBalanceCard from "../components/pnk-balance-card";
import RequiredChainIdGateway from "../components/required-chain-id-gateway";
import RequiredChainIdModal from "../components/required-chain-id-modal";
import StakeModal from "../components/stake-modal";
import TokenSymbol from "../components/token-symbol";
import TopBanner from "../components/top-banner";
import GetSideChainPnkButton from "../components/get-side-chain-pnk-button";
import SideChainPnk from "../components/side-chain-pnk";
import useChainId from "../hooks/use-chain-id";

const { useDrizzle, useDrizzleState } = drizzleReactHooks;

const buyPnkChainIds = [1];

export default function Courts() {
  const { useCacheCall } = useDrizzle();
  const drizzleState = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
  }));
  const [activeID, setActiveID] = useState();
  const [stakingID, setStakingID] = useState();
  const juror = useCacheCall("KlerosLiquidExtraViews", "getJuror", drizzleState.account);

  const chainId = useChainId();

  const isBuyPnkButtonVisible = buyPnkChainIds.includes(chainId);

  const content = (
    <>
      <TopBanner
        description={
          <>
            Select courts and stake <TokenSymbol token="PNK" />
          </>
        }
        extra={
          <StyledButtonBar>
            <Link
              to="/tokens"
              style={{
                display: isBuyPnkButtonVisible ? "inline-block" : "none",
              }}
            >
              <StyledButton size="large" type="secondary">
                Buy PNK
              </StyledButton>
            </Link>
            <GetSideChainPnkButton />
            <StyledButton
              onClick={useCallback(() => setStakingID(null), [])}
              size="large"
              style={{ maxWidth: "120px" }}
              type="primary"
            >
              Join a Court
            </StyledButton>
          </StyledButtonBar>
        }
        title="Courts"
      />
      <AlternativeChainCourt />
      {juror && juror.subcourtIDs.filter((ID) => ID !== "0").length > 0 ? <PNKBalanceCard /> : ""}
      <Spin spinning={!juror}>
        <Row gutter={40}>
          {juror &&
            (juror.subcourtIDs.filter((ID) => ID !== "0").length === 0 ? (
              <>
                <Divider />
                <StyledCol>You have not joined any courts yet.</StyledCol>
              </>
            ) : (
              [...new Set(juror.subcourtIDs)]
                .filter((ID) => ID !== "0")
                .map((ID) => String(ID - 1))
                .map((ID) => (
                  <Col key={ID} md={12} xl={8}>
                    <CourtCard ID={ID} onClick={setActiveID} onStakeClick={setStakingID} />
                  </Col>
                ))
            ))}
        </Row>
      </Spin>
      {activeID !== undefined && <CourtDrawer ID={activeID} onClose={setActiveID} />}
      {stakingID === undefined ? null : stakingID === null ? (
        <CourtCascaderModal onClick={setStakingID} />
      ) : (
        <StakeModal ID={stakingID} onCancel={setStakingID} />
      )}
      <SideChainPnk showGetSideChainPnkModal={false} />
    </>
  );

  return (
    <RequiredChainIdGateway
      renderOnMismatch={({ requiredChainId }) => (
        <>
          {content}
          <RequiredChainIdModal requiredChainId={requiredChainId} />
        </>
      )}
    >
      {content}
    </RequiredChainIdGateway>
  );
}

const StyledCol = styled(Col)`
  color: #d09cff;
  font-size: 24px;
  font-weight: 500;
  line-height: 28px;
  text-align: center;
`;

const StyledButtonBar = styled.div`
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 16px;

  @media (max-width: 576px) {
    min-width: 100%;
    flex-wrap: wrap;
  }
`;

const StyledButton = styled(Button)`
  box-shadow: none;
  text-shadow: none;
`;
