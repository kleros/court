import React from "react";
import t from "prop-types";
import clsx from "clsx";
import styled from "styled-components/macro";
import { Badge, Dropdown, Menu, message, Skeleton } from "antd";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import useChainId from "../hooks/use-chain-id";
import { chainIdToNetworkShortName } from "../helpers/networks";
import { requestSwitchChain } from "../api/side-chain";
import { useDrizzle } from "../bootstrap/drizzle";
import { VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import { useSetRequiredChainId } from "./required-chain-id-gateway";

const { useDrizzleState } = drizzleReactHooks;

// Only allow switching to production chains
const switchableChains = {
  1: "Mainnet",
  100: "Gnosis Chain",
};

function SwitchChainMenu() {
  const { drizzle } = useDrizzle();
  const { account } = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
  }));
  const chainId = useChainId();
  const setRequiredChainId = useSetRequiredChainId();

  const handleSwitchChain = async (targetChainId) => {
    if (targetChainId === chainId) return; // Already on this chain

    if (account === VIEW_ONLY_ADDRESS) {
      setRequiredChainId(targetChainId, { location: "/" });
      window.location.reload();
    } else {
      try {
        await requestSwitchChain(drizzle.web3.currentProvider, targetChainId);
      } catch (error) {
        console.error("Failed to switch chain:", error);
        message.error({ content: "Failed to switch network. Please try again.", key: "switch-chain" });
      }
    }
  };

  return (
    <StyledMenu>
      {Object.entries(switchableChains)
        .filter(([key]) => Number(key) !== chainId)
        .map(([key, value]) => (
          <Menu.Item key={key} onClick={() => handleSwitchChain(Number(key))}>
            <span>{value}</span>
          </Menu.Item>
        ))}
    </StyledMenu>
  );
}

export default function NetworkStatus({ className }) {
  const { status } = useDrizzleState((drizzleState) => ({
    status: drizzleState.web3.status,
  }));
  const chainId = useChainId();

  return chainId ? (
    <Dropdown overlay={<SwitchChainMenu />} trigger={["click"]}>
      <StyledBadge
        className={clsx(status, className)}
        status={networkStatusToBadgeStatus[status]}
        text={chainIdToNetworkShortName[chainId]}
      />
    </Dropdown>
  ) : (
    <StyledSkeleton active paragraph={false} />
  );
}

NetworkStatus.propTypes = {
  className: t.string,
};

const networkStatusToBadgeStatus = {
  initialized: "success",
  initializing: "warning",
  failed: "danger",
};

const StyledMenu = styled(Menu)`
  border-radius: 4px;
  background: ${({ theme }) => theme.componentBackground};
  border: 1px solid ${({ theme }) => theme.borderColor};
`;

const StyledBadge = styled(Badge)`
  white-space: nowrap;
  cursor: pointer;
  background-color: ${({ theme }) => theme.headerSkeletonBase};
  border-radius: 24px;
  padding: 8px 12px;
  font-weight: 400;
  transition: all 0.2s ease-in;

  :hover,
  :focus {
    background-color: ${({ theme }) => theme.headerSkeletonHighlight};
  }

  &.initialized {
    color: ${({ theme }) => theme.successColor};
  }

  &.initializing {
    color: ${({ theme }) => theme.warningColor};
  }

  &.failed {
    color: ${({ theme }) => theme.errorColor};
  }

  .ant-badge-status-dot {
    width: 8px;
    height: 8px;
  }

  .ant-badge-status-text {
    color: ${({ theme }) => theme.textOnPurple};
  }
`;

const StyledSkeleton = styled(Skeleton)`
  && {
    display: block;
    width: 80px;
    margin: 0;

    .ant-skeleton-content {
      display: block;
    }

    .ant-skeleton-title {
      margin: 0;
      border-radius: 4px;
      background-image: linear-gradient(
        90deg,
        ${({ theme }) => theme.skeletonColor} 25%,
        ${({ theme }) => theme.skeletonHighlight} 37%,
        ${({ theme }) => theme.skeletonColor} 63%
      ) !important;
    }
  }
`;
