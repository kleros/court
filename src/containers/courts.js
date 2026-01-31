import React, { useCallback, useState } from "react";
import styled from "styled-components/macro";
import { Link } from "react-router-dom";
import { Button, Col, Row, Spin } from "antd";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import SwitchCourtChain from "../components/side-chain/switch-court-chain";
import CourtCard from "../components/court-card";
import CourtCascaderModal from "../components/court-cascader-modal";
import CourtDrawer from "../components/court-drawer";
import PNKBalanceCard from "../components/pnk-balance-card";
import RequiredChainIdGateway from "../components/required-chain-id-gateway";
import RequiredChainIdModal from "../components/required-chain-id-modal";
import StakeModal from "../components/stake-modal";
import TopBanner from "../components/top-banner";
import SideChainPnkActions from "../components/side-chain/pnk-actions";
import useChainId from "../hooks/use-chain-id";

const { useDrizzle, useDrizzleState } = drizzleReactHooks;

const buyPnkChainIds = [1, 100];

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
        description={<>Select courts and stake PNK</>}
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
      <SwitchCourtChain />
      {juror && juror.subcourtIDs.filter((ID) => ID !== "0").length > 0 ? <PNKBalanceCard /> : ""}
      <Spin spinning={!juror}>
        <Row gutter={40}>
          {juror &&
            (juror.subcourtIDs.filter((ID) => ID !== "0").length === 0 ? (
              <StyledEmptyState>
                <StyledEmptyStateIcon>
                  <span role="img" aria-label="scales of justice">
                    ⚖️
                  </span>
                </StyledEmptyStateIcon>
                <StyledEmptyStateTitle>You have not joined any courts yet</StyledEmptyStateTitle>
                <StyledEmptyStateDescription>
                  Click &ldquo;Join a Court&rdquo; above to stake PNK and start earning rewards as a juror.
                </StyledEmptyStateDescription>
              </StyledEmptyState>
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
      <SideChainPnkActions showGetSideChainPnkModal={false} />
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

const StyledEmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  margin: 24px auto;
  max-width: 540px;
  background: ${({ theme }) => theme.elevatedBackground};
  border: 1px solid ${({ theme }) => theme.borderColor};
  border-radius: 12px;
  text-align: center;
`;

const StyledEmptyStateIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
  opacity: ${({ theme }) => (theme.name === "dark" ? 0.9 : 0.7)};
`;

const StyledEmptyStateTitle = styled.h3`
  color: ${({ theme }) => theme.textPrimary};
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px 0;
`;

const StyledEmptyStateDescription = styled.p`
  color: ${({ theme }) => theme.textSecondary};
  font-size: 14px;
  margin: 0;
  line-height: 1.5;
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
