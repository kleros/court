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

const { useDrizzleState } = drizzleReactHooks;

// Only allow switching to production chains
const switchableChains = {
  1: "Mainnet",
  100: "Gnosis Chain",
};

function SwitchChainMenu() {
  const { drizzle } = useDrizzle();
  const chainId = useChainId();

  const handleSwitchChain = async (targetChainId) => {
    if (targetChainId === chainId) return; // Already on this chain

    try {
      await requestSwitchChain(drizzle.web3.currentProvider, targetChainId);
    } catch (error) {
      console.error("Failed to switch chain:", error);
      message.error({ content: "Failed to switch network. Please try again.", key: "switch-chain" });
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
`;

const StyledBadge = styled(Badge)`
  white-space: nowrap;
  cursor: pointer;
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: 24px;
  padding: 8px 12px;
  font-weight: 400;
  transition: all 0.2s ease-in;

  :hover,
  :focus {
    background-color: rgba(255, 255, 255, 0.25);
  }

  &.initialized {
    color: #52c41a;
  }

  &.initializing {
    color: #faad14;
  }

  &.failed {
    color: #f5222d;
  }

  .ant-badge-status-dot {
    width: 8px;
    height: 8px;
  }

  .ant-badge-status-text {
    color: #fff;
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
        rgba(242, 242, 242, 0.25) 25%,
        rgba(230, 230, 230, 0.25) 37%,
        rgba(242, 242, 242, 0.25) 63%
      ) !important;
    }
  }
`;
