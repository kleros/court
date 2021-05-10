import React, { useCallback, useEffect, useState } from "react";
import { Button, Col, Row } from "antd";
import styled from "styled-components/macro";
import { Link } from "react-router-dom";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import CasesListCard from "../components/cases-list-card";
import CourtsListCard from "../components/courts-list-card";
import NotificationsCard from "../components/notifications-card";
import OngoingCasesCard from "../components/ongoing-cases-card";
import PerformanceCard from "../components/performance-card";
import RewardCard from "../components/reward-card";
import ClaimModal from "../components/claim-modal";
import TopBanner from "../components/top-banner";
import TokenSymbol from "../components/token-symbol";
import { ReactComponent as Present } from "../assets/images/present.svg";

const { useDrizzleState } = drizzleReactHooks;

const airdropNetworkIds = [1, 42, 77];

export default function Home() {
  const drizzleState = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
    web3: drizzleState.web3,
  }));

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

  return (
    <>
      {airdropNetworkIds.includes(drizzleState.web3.networkId) ? (
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
          <>
            <StyledButton
              onClick={showModal}
              size="large"
              style={{
                marginRight: "16px",
                backgroundColor: "#9013FE",
                border: "none",
                display: isModalButtonVisible ? "inline-block" : "none",
              }}
              type="primary"
            >
              <Present style={{ marginRight: "8px", verticalAlign: "text-top" }} />
              Claim <TokenSymbol token="PNK" />
            </StyledButton>
            <Link to="/courts">
              <StyledButton size="large" style={{ maxWidth: "120px" }} type="primary">
                Join a Court
              </StyledButton>
            </Link>
          </>
        }
      />
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
}

const StyledButton = styled(Button)`
  box-shadow: none;
  float: right;
  text-shadow: none;
`;
