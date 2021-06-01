import React from "react";
import styled from "styled-components/macro";
import { useHistory, useLocation } from "react-router-dom";
import Web3 from "web3";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { Button, Card, Divider, Icon } from "antd";
import { counterPartyChainIdMap, TokenBridgeApiProvider, useTokenBridgeApi } from "../../api/token-bridge";
import usePromise from "../../hooks/use-promise";
import { useAsyncGenerator } from "../../hooks/use-generators";
import useQueryParams from "../../hooks/use-query-params";
import { chainIdToNetworkName } from "../../helpers/networks";
import TokenSymbol from "../../components/token-symbol";
import MultiTransactionStatus from "../../components/multi-transaction-status";
import TopBanner from "../../components/top-banner";
import SteppedContent from "../../components/stepped-content";
import MultiChainBalance from "./components/multi-chain-balance";
import SwitchNetworkMessage from "./components/switch-network-message";
import TokenBridgeForm from "./components/token-bridge-form";
import ReadyToUse from "./components/ready-to-use";
import { ExplainerEthereum, ExplainerXDai } from "./components/explainers";

const { toWei } = Web3.utils;

const { useDrizzle, useDrizzleState } = drizzleReactHooks;

export default function TokenBridge() {
  const { drizzle } = useDrizzle();

  return (
    <>
      <TopBanner description="Make cross-chain PNK transfers to your own account" title="PNK Token Bridge" />
      <StyledDivider />
      <TokenBridgeApiProvider web3Provider={drizzle.web3.currentProvider}>
        <TokenBridgeCard />
      </TokenBridgeApiProvider>
    </>
  );
}

function TokenBridgeCard() {
  const tokenBridgeApi = useTokenBridgeApi();
  const account = useDrizzleState((ds) => ds.accounts[0]);

  const queryParams = useQueryParams();
  const wantedChainId = queryParams.wantedChainId && Number(queryParams.wantedChainId);

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

  const relayTokens = useRelayTokens(tokenBridgeApi.origin.relayTokens);
  const { isDone, isRunning, run } = relayTokens;

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

  const originChainId = tokenBridgeApi.origin.chainId;
  const destinationChainId = tokenBridgeApi.destination.chainId;

  const { step, next, previous, first } = useUrlParamStep();

  const actions =
    step > 0
      ? [
          <Button key="start-over" onClick={() => first({ wantedChainId: undefined })}>
            <Icon type="arrow-left" />
            Start Over
          </Button>,
        ]
      : null;

  // When relay tokens is complete, go to the next step
  React.useEffect(() => {
    if (step === 0 && isDone) {
      next({ wantedChainId: destinationChainId });
    }
  }, [step, isDone, next, destinationChainId]);

  // When switching to the right network, go to the next step
  React.useEffect(() => {
    if (step === 1 && originChainId === wantedChainId) {
      next();
    }
  }, [step, originChainId, wantedChainId, next]);

  // When switching to the wrong network while on the last step, go to the previous one
  React.useEffect(() => {
    if (step === 2 && originChainId !== wantedChainId) {
      previous();
    }
  }, [step, originChainId, wantedChainId, previous]);

  const originToken = <TokenSymbol chainId={originChainId} token="PNK" />;
  const destinationToken = <TokenSymbol chainId={destinationChainId} token="PNK" />;

  const explainerProps = [77, 100].includes(wantedChainId)
    ? {
        ethereumChainId: counterPartyChainIdMap[wantedChainId],
        xDaiChainId: wantedChainId,
      }
    : [1, 42].includes(wantedChainId)
    ? {
        ethereumChainId: wantedChainId,
        xDaiChainId: counterPartyChainIdMap[wantedChainId],
      }
    : tokenBridgeApi.destination.side === "xDai"
    ? {
        ethereumChainId: tokenBridgeApi.origin.chainId,
        xDaiChainId: tokenBridgeApi.destination.chainId,
      }
    : {
        ethereumChainId: tokenBridgeApi.destination.chainId,
        xDaiChainId: tokenBridgeApi.origin.chainId,
      };

  const Explainer =
    [77, 100].includes(wantedChainId) || tokenBridgeApi.destination.side === "xDai" ? ExplainerXDai : ExplainerEthereum;

  return (
    <StyledCard actions={actions}>
      <Explainer {...explainerProps} />
      <StyledDivider />
      <SteppedContent
        size="small"
        current={step}
        steps={[
          {
            title: (
              <>
                Convert {originToken} to {destinationToken}
              </>
            ),
            children() {
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
                  <StyledDivider />
                  <TokenBridgeForm
                    maxAvailable={originTokenData.available}
                    isSubmitting={isSubmitting}
                    disabled={relayTokens.isDone}
                    onFinish={handleFinish}
                  />
                  {relayTokens.transactions.length > 0 ? (
                    <>
                      <StyledDivider $size={0.5} />
                      <MultiTransactionStatus
                        transactions={relayTokens.transactions}
                        chainId={originChainId}
                        error={relayTokens.error}
                      />
                    </>
                  ) : null}
                </>
              );
            },
          },
          {
            title: `Switch to ${chainIdToNetworkName[wantedChainId ?? tokenBridgeApi.destination.chainId]}`,
            children() {
              return (
                <SwitchNetworkMessage
                  originToken={originToken}
                  destinationChainId={wantedChainId ?? tokenBridgeApi.destination.chainId}
                />
              );
            },
          },
          {
            title: "Ready to use",
            children() {
              return <ReadyToUse wantedChainId={wantedChainId} currentChainId={tokenBridgeApi.origin.chainId} />;
            },
          },
        ]}
      />
    </StyledCard>
  );
}

function useUrlParamStep() {
  const history = useHistory();
  const location = useLocation();

  const queryParams = useQueryParams();
  const stepFromUrl = queryParams.step ? queryParams.step - 1 : 0;

  const [step, setStep] = React.useState(stepFromUrl);

  const setPersistedStep = React.useCallback(
    (newStep, additionalParams = {}) => {
      setStep(newStep);

      const { step: _, ...rest } = additionalParams;
      const newQueryParams = Object.fromEntries(
        Object.entries({
          ...queryParams,
          step: newStep + 1,
          ...rest,
        }).filter(([_, value]) => value !== undefined)
      );
      history.replace({ ...location, search: new URLSearchParams(newQueryParams).toString() });
    },
    [history, queryParams, location]
  );

  const next = React.useCallback(
    (additionalParams) => {
      setPersistedStep(step + 1, additionalParams);
    },
    [setPersistedStep, step]
  );

  const previous = React.useCallback(
    (additionalParams) => {
      setPersistedStep(step - 1, additionalParams);
    },
    [setPersistedStep, step]
  );

  const first = React.useCallback(
    (additionalParams) => {
      setPersistedStep(0, additionalParams);
    },
    [setPersistedStep]
  );

  return {
    step,
    next,
    previous,
    first,
  };
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

const StyledCard = styled(Card)`
  margin: 20px auto 0;
  max-width: 768px;
  border-radius: 12px;
  box-shadow: 0px 6px 36px #bc9cff;

  .ant-card-actions {
    background: none;
    border: none;
    padding: 16px 24px;
    display: flex;
    gap: 16px;

    > li {
      text-align: inherit;
      border: none;
      width: auto !important;
      padding: 0;
    }

    ::after,
    ::before {
      display: none;
    }
  }
`;

const StyledDivider = styled(Divider).attrs((p) => ({
  ...p,
  type: p.type ?? "horizontal",
  $size: p.$size ?? 1,
}))`
  border: none !important;
  background: none !important;
  margin: ${(p) => (p.type === "horizontal" ? `${24 * p.$size}px 0` : `0 ${24 * p.$size}px`)};
`;
