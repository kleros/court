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
import TopBanner from "../components/top-banner";
import TokenSymbol from "../components/token-symbol";
import RequiredChainIdGateway from "../components/required-chain-id-gateway";
import RequiredChainIdModal from "../components/required-chain-id-modal";
import SideChainPnkActions from "../components/side-chain/pnk-actions";
import useChainId from "../hooks/use-chain-id";
import { ReactComponent as Present } from "../assets/images/present.svg";

const { useDrizzleState } = drizzleReactHooks;

const buyPnkChainIds = [1, 100];

export default function Home() {
  const drizzleState = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
    web3: drizzleState.web3,
  }));

  const chainId = useChainId();

  const isBuyPnkButtonVisible = buyPnkChainIds.includes(chainId);

  const [isModalButtonVisible, setIsModalButtonVisible] = useState(false);

  useEffect(() => {
    setIsModalButtonVisible(false);
  }, [drizzleState.account]);

  const content = (
    <>
      <TopBanner
        title="My Dashboard"

      />
      <SwitchCourtChain />
      <RewardCard />
      <OngoingCasesCard />
      <NotificationsCard />
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
