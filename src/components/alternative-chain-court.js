import React from "react";
import styled from "styled-components/macro";
import { Link } from "react-router-dom";
import { Icon, Skeleton } from "antd";
import { ButtonLink } from "../adapters/antd";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { TokenBridgeApiProvider, useTokenBridgeApi, isSupportedChain } from "../api/token-bridge";
import useAccount from "../hooks/use-account";
import useChainId from "../hooks/use-chain-id";
import usePromise from "../hooks/use-promise";
import { useSetRequiredChainId } from "../components/required-chain-id-gateway";
import { chainIdToNetworkName } from "../helpers/networks";

const { useDrizzle } = drizzleReactHooks;

export default function AlternativeChainCourt() {
  const { drizzle } = useDrizzle();
  const chainId = useChainId(drizzle.web3);

  return isSupportedChain(chainId) ? (
    <TokenBridgeApiProvider web3Provider={drizzle.web3.currentProvider} renderOnLoading={null}>
      <AlternativeChainCourtLink />
    </TokenBridgeApiProvider>
  ) : null;
}

function AlternativeChainCourtLink() {
  const tokenBridgeApi = useTokenBridgeApi();
  const account = useAccount();
  const destinationChainId = tokenBridgeApi.destination.chainId;
  const destinationToken = useDestinationTokenData({ getBalance: tokenBridgeApi.destination.getBalance, account });

  const setRequiredChainId = useSetRequiredChainId();

  const switchNetwork = async () => {
    // Tries to automatically switch the chain...
    try {
      await tokenBridgeApi.destination.switchChain();
    } catch {
      // If the call fails, it means that it's not supported.
      // This happens for the native Ethereum Mainnet and well-known testnets,
      // such as Ropsten and Kovan. Apparently this is due to security reasons.
      // In this case we just update the required chain ID on the UI so the users
      // can make the switch themselves.
      setRequiredChainId(tokenBridgeApi.destination.chainId);
    }
  };

  return (
    <StyledWrapper>
      {destinationToken.balance === undefined ? (
        <StyledSkeleton />
      ) : String(destinationToken.balance) === "0" ? (
        <Link to="/token-bridge" component={ButtonLink} type="link">
          <span>Court on {chainIdToNetworkName[destinationChainId]}</span>
          <Icon type="arrow-right" />
        </Link>
      ) : (
        <ButtonLink onClick={switchNetwork}>
          <span>Court on {chainIdToNetworkName[destinationChainId]}</span>
          <Icon type="arrow-right" />
        </ButtonLink>
      )}
    </StyledWrapper>
  );
}

function useDestinationTokenData({ getBalance, account }) {
  const balance = usePromise(React.useMemo(() => getBalance({ address: account }), [getBalance, account]));

  return React.useMemo(
    () => ({
      balance: balance.value,
      errors: {
        balance: balance.error,
      },
    }),
    [balance.value, balance.error]
  );
}

const StyledWrapper = styled.div`
  margin: 24px 0 -48px;
  display: flex;
  justify-content: flex-end;
`;

const StyledSkeleton = styled(Skeleton).attrs(({ active = true, paragraph = false }) => ({ active, paragraph }))`
  &.ant-skeleton {
    display: block;
    width: 160px;
  }

  .ant-skeleton-title {
    height: 16px;
    margin: 8px 0;
  }

  .ant-skeleton-content {
    display: block;
  }
`;
