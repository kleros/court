import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { Link } from "react-router-dom";
import { Alert, Divider } from "antd";
import Web3 from "web3";
import { useTokenBridgeApi } from "../../../api/token-bridge";
import { useAsyncGenerator } from "../../../hooks/use-generators";
import useAccount from "../../../hooks/use-account";
import usePromise from "../../../hooks/use-promise";
import { ButtonLink } from "../../../adapters/antd";
import MultiChainBalance from "../../../components/multi-chain-balance";
import MultiTransactionStatus from "../../../components/multi-transaction-status";
import TokenSymbol from "../../../components/token-symbol";
import TokenBridgeForm from "./token-bridge-form";

const { toWei, toBN } = Web3.utils;

const _1_PNK = toBN("1000000000000000000");

export default function SwapStep({ onRunning, onDone }) {
  const account = useAccount();

  const tokenBridgeApi = useTokenBridgeApi();
  const originChainId = tokenBridgeApi.origin.chainId;
  const originTokenSymbol = <TokenSymbol chainId={originChainId} token="PNK" />;
  const destinationChainId = tokenBridgeApi.destination.chainId;

  const originTokenData = useOriginTokenData({
    ...tokenBridgeApi.origin,
    account,
  });

  // Should have at least 1 entire PNK available.
  const hasAvailableOriginTokens = originTokenData.available ? toBN(originTokenData.available).gt(_1_PNK) : false;
  const hasOriginTokens = originTokenData.balance ? toBN(originTokenData.balance).gt(_1_PNK) : false;

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

  const { run, isRunning, isDone, transactions, error } = useRelayTokens(tokenBridgeApi.origin.relayTokens);

  React.useEffect(() => {
    if (isRunning) {
      onRunning();
    }
  }, [onRunning, isRunning]);

  React.useEffect(() => {
    if (isDone) {
      onDone();
    }
  }, [onDone, isDone]);

  const isSubmitting = isRunning ?? false;

  const handleFinish = React.useCallback(
    (values) => {
      const amountInWei = toWei(String(values.origin));

      run({
        address: account,
        amount: amountInWei,
      });
    },
    [run, account]
  );

  return (
    <>
      <MultiChainBalance
        errors={tokenDataErrors}
        originChainId={originChainId}
        originBalance={originTokenData.balance}
        originTotalStaked={originTokenData.staked}
        destinationChainId={destinationChainId}
        destinationBalance={destinationTokenData.balance}
      />
      {hasAvailableOriginTokens ? (
        <>
          <StyledDivider />
          <TokenBridgeForm
            maxAvailable={originTokenData.available}
            isSubmitting={isSubmitting}
            disabled={isDone}
            onFinish={handleFinish}
          />
          {transactions.length > 0 ? (
            <>
              <StyledDivider $size={0.5} />
              <MultiTransactionStatus transactions={transactions} chainId={originChainId} error={error} />
            </>
          ) : null}
        </>
      ) : hasOriginTokens ? (
        <>
          <StyledDivider $size={0.5} />
          <StyledAlert
            showIcon
            message={<>All your {originTokenSymbol} are staked at the moment.</>}
            description={
              <>
                <p>
                  Please go to the{" "}
                  <Link to="/courts" component={ButtonLink}>
                    Courts
                  </Link>{" "}
                  page and unstake some of your tokens to be able to swap them.
                </p>
                <p>Don&rsquo;t want to do this right now? You can just skip this step.</p>
              </>
            }
          />
        </>
      ) : (
        <>
          <StyledDivider $size={0.5} />
          <StyledAlert
            showIcon
            message={<>You don&rsquo;t have {originTokenSymbol} at the moment.</>}
            description={
              <>
                <p>
                  Please go to the{" "}
                  <Link to="/tokens" component={ButtonLink}>
                    Tokens
                  </Link>{" "}
                  page and get some {originTokenSymbol} to be able to swap them.
                </p>
                <p>Don&rsquo;t want to do this right now? You can just skip this step.</p>
              </>
            }
          />
        </>
      )}
    </>
  );
}

SwapStep.propTypes = {
  onRunning: t.func,
  onDone: t.func,
};

SwapStep.defualtProps = {
  onRunning() {},
  onDone() {},
};

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

function useRelayTokens(relayTokens) {
  const { run, ...relayTokensResult } = useAsyncGenerator(relayTokens);

  const approve = relayTokensResult?.value?.approve;
  const relay = relayTokensResult?.value?.relay;

  const transactions = React.useMemo(() => {
    return [
      {
        state: approve?.state,
        txHash: approve?.txHash,
        title: "Approve",
      },
      {
        state: relay?.state,
        txHash: relay?.txHash,
        title: "Relay Tokens",
      },
    ].filter((tx) => Boolean(tx.state));
  }, [approve?.state, approve?.txHash, relay?.state, relay?.txHash]);

  return {
    run,
    transactions,
    ...relayTokensResult,
  };
}

const StyledDivider = styled(Divider).attrs((p) => ({
  ...p,
  type: p.type ?? "horizontal",
  $size: p.$size ?? 1,
}))`
  border: none !important;
  background: none !important;
  margin: ${(p) => (p.type === "horizontal" ? `${24 * p.$size}px 0` : `0 ${24 * p.$size}px`)};
`;

const StyledAlert = styled(Alert)`
  p {
    margin: 0;

    & + p {
      margin-top: 8px;
    }
  }
`;
