import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { Button, Modal } from "antd";
import { chainIdToNetworkName } from "../helpers/networks";
import { TokenBridgeApiProvider, useTokenBridgeApi, isSupportedSideChain } from "../api/token-bridge";
import useAccount from "../hooks/use-account";
import usePromise from "../hooks/use-promise";
import { useCleanRequiredChainId } from "./required-chain-id-gateway";
import MultiChainBalance from "./multi-chain-balance";

const { useDrizzle } = drizzleReactHooks;

export default function RequiredChainIdModal({ requiredChainId }) {
  const { drizzle } = useDrizzle();

  const cleanRequiredChainId = useCleanRequiredChainId();

  return (
    <TokenBridgeApiProvider web3Provider={drizzle.web3.currentProvider}>
      <StyledModal
        visible
        centered
        width={640}
        footer={
          isSupportedSideChain(requiredChainId) ? <SwitchNetworkButton requiredChainId={requiredChainId} /> : null
        }
        title={<>Switch to {chainIdToNetworkName[requiredChainId]}</>}
        onCancel={() => cleanRequiredChainId()}
      >
        <RequiredChainIdModalContent />
      </StyledModal>
    </TokenBridgeApiProvider>
  );
}

RequiredChainIdModal.propTypes = {
  requiredChainId: t.number,
};

function SwitchNetworkButton({ requiredChainId }) {
  const tokenBridgeApi = useTokenBridgeApi();

  const switchChain = async () => {
    try {
      await tokenBridgeApi.destination.switchChain();
    } catch {
      // Do nothing...
    }
  };

  return (
    <Button onClick={switchChain}>
      <span>Switch to {chainIdToNetworkName[requiredChainId]}</span>
    </Button>
  );
}

SwitchNetworkButton.propTypes = {
  requiredChainId: t.number.isRequired,
};

function RequiredChainIdModalContent() {
  const tokenBridgeApi = useTokenBridgeApi();
  const account = useAccount();

  const originTokenData = useOriginTokenData({
    ...tokenBridgeApi.origin,
    account,
  });

  const destinationTokenData = useDestinationTokenData({
    ...tokenBridgeApi.destination,
    account,
  });

  const tokenDataErrors = React.useMemo(
    () => ({
      origin: originTokenData.errors,
      destination: destinationTokenData.errors,
    }),
    [originTokenData.errors, destinationTokenData.errors]
  );

  const originChainId = tokenBridgeApi.origin.chainId;
  const destinationChainId = tokenBridgeApi.destination.chainId;

  return (
    <MultiChainBalance
      errors={tokenDataErrors}
      originChainId={originChainId}
      originBalance={originTokenData.balance}
      originTotalStaked={originTokenData.staked}
      destinationChainId={destinationChainId}
      destinationBalance={destinationTokenData.balance}
    />
  );
}

function useOriginTokenData({ getBalance, getStake, account }) {
  const balance = usePromise(React.useMemo(() => getBalance({ address: account }), [getBalance, account]));
  const staked = usePromise(React.useMemo(() => getStake({ address: account }), [getStake, account]));
  const available = React.useMemo(() => (balance.value && staked.value ? balance.value.sub(staked.value) : undefined), [
    balance.value,
    staked.value,
  ]);

  const errors = React.useMemo(
    () => ({
      balance: balance.error,
      staked: staked.error,
    }),
    [balance.error, staked.error]
  );

  return React.useMemo(
    () => ({
      balance: balance.value,
      staked: staked.value,
      available: available,
      errors: errors,
    }),
    [balance.value, staked.value, available, errors]
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

const StyledModal = styled(Modal)`
  .ant-modal-header {
    border: none;
  }

  .ant-modal-title {
    font-size: 36px;
    line-height: 1.33;
    text-align: center;
    color: #4d00b4;
  }

  .ant-modal-footer {
    border: none;
    text-align: center;
  }
`;
