import React, { useCallback, useEffect, useState } from "react";
import { Button, Col, Row } from "antd";
import styled from "styled-components/macro";
import { Link } from "react-router-dom";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import SwitchCourtChain from "../components/side-chain/switch-court-chain";
import CasesListCard from "../components/cases-list-card";
import CourtsListCard from "../components/courts-list-card";
import NotificationsCard from "../components/notifications-card";
import OngoingCasesCard from "../components/ongoing-cases-card";
import PerformanceCard from "../components/performance-card";
import RewardCard from "../components/reward-card";
import ClaimModal from "../components/claim-modal";
import TopBanner from "../components/top-banner";
import TokenSymbol from "../components/token-symbol";
import RequiredChainIdGateway from "../components/required-chain-id-gateway";
import RequiredChainIdModal from "../components/required-chain-id-modal";
import SideChainPnkActions from "../components/side-chain/pnk-actions";
import useChainId from "../hooks/use-chain-id";
import { ReactComponent as Present } from "../assets/images/present.svg";
import CourtDrawer from "../components/court-drawer";

const { useDrizzleState } = drizzleReactHooks;

const airdropChainIds = [1, 100];
const buyPnkChainIds = [1, 100];

export default function Home() {
  const drizzleState = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
    web3: drizzleState.web3,
  }));

  const chainId = useChainId();

  const isBuyPnkButtonVisible = buyPnkChainIds.includes(chainId);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isModalButtonVisible, setIsModalButtonVisible] = useState(false);
  const [apy, setApy] = useState(0);

  const [activeSubcourtID, setActiveSubcourtID] = useState();

  useEffect(() => {
    setIsModalButtonVisible(false);
  }, [drizzleState.account]);

  const showModalButton = useCallback(() => {
    setIsModalButtonVisible(true);
  }, []);

  const showModal = useCallback(() => {
    setIsModalVisible(true);
  }, []);

  const handleOk = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  const handleCancel = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  const apyCallback = useCallback((apy) => {
    setApy(apy);
  }, []);

  const content = (
    <>
      {airdropChainIds.includes(chainId) ? (
        <ClaimModal
          visible={isModalVisible}
          onOk={handleOk}
          onCancel={handleCancel}
          displayButton={showModalButton}
          apyCallback={apyCallback}
        />
      ) : null}
      <TopBanner
        title="My Dashboard"
        extra={
          <StyledButtonBar>
            <StyledClaimButton
              onClick={showModal}
              size="large"
              style={{
                display: isModalButtonVisible ? "inline-block" : "none",
              }}
              type="primary"
            >
              <Present style={{ marginRight: "8px", verticalAlign: "text-top" }} />
              <span>
                Claim <TokenSymbol token="PNK" />
              </span>
            </StyledClaimButton>
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
            <Link to="/courts">
              <StyledButton size="large" type="primary">
                See Courts
              </StyledButton>
            </Link>
          </StyledButtonBar>
        }
      />
      <SwitchCourtChain />
      <RewardCard />
      <Row gutter={32}>
        <Col lg={8}>
          <CourtsListCard apy={apy > 1000000 ? apy : null} setActiveSubcourtID={setActiveSubcourtID} />
        </Col>
        <Col lg={8}>
          <CasesListCard />
        </Col>
        <Col lg={8}>
          <PerformanceCard />
        </Col>
      </Row>
      <OngoingCasesCard />
      <NotificationsCard />
      <SideChainPnkActions showGetSideChainPnkModal={false} />
      {activeSubcourtID !== undefined && <CourtDrawer ID={activeSubcourtID} onClose={setActiveSubcourtID} />}
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

const StyledClaimButton = styled(StyledButton)`
  background-color: #9013fe;
  border: none;

  :hover,
  :focus {
    background-color: #a541fe;
  }

  :active {
    background-color: #6601be;
  }
`;
