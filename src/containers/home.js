import React, { useCallback, useEffect, useState } from "react";
import { Button, Col, Row } from "antd";
import styled from "styled-components/macro";
import { Link } from "react-router-dom";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import { TokenBridgeApiProvider, isSupportedChain } from "../api/token-bridge";
import AlternativeChainCourt from "../components/alternative-chain-court";
import CasesListCard from "../components/cases-list-card";
import CourtsListCard from "../components/courts-list-card";
import GetSideChainPnkButton from "../components/get-side-chain-pnk-button";
import NotificationsCard from "../components/notifications-card";
import OngoingCasesCard from "../components/ongoing-cases-card";
import PerformanceCard from "../components/performance-card";
import RewardCard from "../components/reward-card";
import ClaimModal from "../components/claim-modal";
import TopBanner from "../components/top-banner";
import TokenSymbol from "../components/token-symbol";
import RequiredChainIdGateway from "../components/required-chain-id-gateway";
import RequiredChainIdModal from "../components/required-chain-id-modal";
import useChainId from "../hooks/use-chain-id";
import { ReactComponent as Present } from "../assets/images/present.svg";

const { useDrizzleState, useDrizzle } = drizzleReactHooks;

const airdropChainIds = [1, 42, 77];
const buyPnkChainIds = [1];

export default function Home() {
  const drizzleState = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
    web3: drizzleState.web3,
  }));

  const { drizzle } = useDrizzle();
  const chainId = useChainId(drizzle.web3);

  const isBuyPnkButtonVisible = buyPnkChainIds.includes(chainId);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isModalButtonVisible, setIsModalButtonVisible] = useState(false);
  const [apy, setApy] = useState(0);

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
        title="Welcome!"
        description="This is the Kleros Juror Dashboard"
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
            {isSupportedChain(chainId) ? (
              <TokenBridgeApiProvider web3Provider={drizzle.web3.currentProvider} renderOnLoading={null}>
                <GetSideChainPnkButton />
              </TokenBridgeApiProvider>
            ) : null}
            <Link to="/courts">
              <StyledButton size="large" type="primary">
                See Courts
              </StyledButton>
            </Link>
          </StyledButtonBar>
        }
      />
      <AlternativeChainCourt />
      <RewardCard />
      <Row gutter={32}>
        <Col lg={8}>
          <CourtsListCard apy={apy > 1000000 ? apy : null} />
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
