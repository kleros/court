import React from "react";
import t from "prop-types";
import clsx from "clsx";
import styled from "styled-components/macro";
import { Badge, Skeleton } from "antd";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import useChainId from "../hooks/use-chain-id";
import { chainIdToNetworkShortName } from "../helpers/networks";

const { useDrizzleState } = drizzleReactHooks;

export default function NetworkStatus({ className }) {
  const { status } = useDrizzleState((drizzleState) => ({
    status: drizzleState.web3.status,
  }));
  const chainId = useChainId();

  return chainId ? (
    <StyledBadge
      className={clsx(status, className)}
      status={networkStatusToBadgeStatus[status]}
      text={chainIdToNetworkShortName[chainId]}
    />
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

const StyledBadge = styled(Badge)`
  white-space: nowrap;

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
