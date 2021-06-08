import React from "react";
import styled from "styled-components/macro";
import { useHistory, useLocation } from "react-router-dom";
import { Button, Card, Divider, Icon, message } from "antd";
import {
  counterPartyChainIdMap,
  isSupportedMainChain,
  isSupportedSideChain,
  useTokenBridgeApi,
} from "../../api/token-bridge";
import SteppedContent from "../../components/stepped-content";
import SwitchNetworkMessage from "../../components/switch-network-message";
import TokenSymbol from "../../components/token-symbol";
import { chainIdToNetworkName } from "../../helpers/networks";
import useQueryParams from "../../hooks/use-query-params";
import { ExplainerEthereum, ExplainerXDai } from "./components/explainers";
import SwapStep from "./components/swap-step";

export default function TokenBridgeCard() {
  const tokenBridgeApi = useTokenBridgeApi();
  const originChainId = tokenBridgeApi.origin.chainId;
  const destinationChainId = tokenBridgeApi.destination.chainId;
  const originTokenSymbol = <TokenSymbol chainId={originChainId} token="PNK" />;
  const destinationTokenSymbol = <TokenSymbol chainId={destinationChainId} token="PNK" />;

  const { step, next, first } = useStep();

  const queryParams = useQueryParams();
  const wantedChainId = queryParams.wantedChainId && Number(queryParams.wantedChainId);

  const [isSwapStepDone, setSwapStepDone] = React.useState(false);
  const completeSwapStep = React.useCallback(() => {
    setSwapStepDone(true);
  }, []);

  const [isSwapStepRunning, setSwapStepRunning] = React.useState(false);
  const runSwapStep = React.useCallback(() => {
    setSwapStepRunning(true);
  }, []);

  const history = useHistory();
  useStepAutoNavigation({
    steps: [
      {
        isDone: isSwapStepDone,
        async onDone() {
          next({ wantedChainId: destinationChainId });
        },
      },
      {
        isDone: originChainId === wantedChainId,
        onDone() {
          history.push("/");
        },
      },
    ],
    current: step,
  });

  const actions =
    step > 0
      ? [
          <Button key="start-over" onClick={() => first({ wantedChainId: undefined })}>
            <Icon type="arrow-left" />
            Start Over
          </Button>,
          isSupportedSideChain(destinationChainId) ? (
            <Button
              type="primary"
              key="switch-chain"
              onClick={async () => {
                // Tries to automatically switch the chain...
                try {
                  await tokenBridgeApi.destination.switchChain();
                } catch {
                  // If the call fails, it means that it's not supported.
                  // This happens for the native Ethereum Mainnet and well-known testnets,
                  // such as Ropsten and Kovan. Apparently this is due to security reasons.
                  message.error({
                    key: "switch-network-fail",
                    content: "Failed to switch network. You need to do that manually through MetaMask.",
                  });
                }
              }}
            >
              Switch Network
              <Icon type="arrow-right" />
            </Button>
          ) : null,
        ]
      : [
          <Button key="skip" disabled={isSwapStepRunning} onClick={() => next({ wantedChainId: destinationChainId })}>
            Skip
            <Icon type="arrow-right" />
          </Button>,
        ];

  const explainerProps = isSupportedSideChain(wantedChainId)
    ? {
        ethereumChainId: counterPartyChainIdMap[wantedChainId],
        xDaiChainId: wantedChainId,
      }
    : isSupportedMainChain(wantedChainId)
    ? {
        ethereumChainId: wantedChainId,
        xDaiChainId: counterPartyChainIdMap[wantedChainId],
      }
    : isSupportedSideChain(destinationChainId)
    ? {
        ethereumChainId: originChainId,
        xDaiChainId: destinationChainId,
      }
    : {
        ethereumChainId: destinationChainId,
        xDaiChainId: originChainId,
      };

  const Explainer =
    isSupportedSideChain(wantedChainId) || isSupportedSideChain(destinationChainId) ? ExplainerXDai : ExplainerEthereum;

  return (
    <StyledCard
      title={
        <>
          Swap {originTokenSymbol}/{destinationTokenSymbol}
        </>
      }
      actions={actions}
    >
      <Explainer {...explainerProps} />
      <StyledDivider />
      <SteppedContent
        size="small"
        current={step}
        steps={[
          {
            title: (
              <>
                Convert {originTokenSymbol} to {destinationTokenSymbol}
              </>
            ),
            children() {
              return <SwapStep onRunning={runSwapStep} onDone={completeSwapStep} />;
            },
          },
          {
            title: `Switch to ${chainIdToNetworkName[wantedChainId ?? tokenBridgeApi.destination.chainId]}`,
            children() {
              return (
                <SwitchNetworkMessage
                  title={
                    <>
                      <span role="img" aria-label="tada">
                        🎉
                      </span>{" "}
                      {originTokenSymbol} successfully converted!{" "}
                      <span role="img" aria-label="tada">
                        🎉
                      </span>
                    </>
                  }
                  wantedChainId={wantedChainId ?? tokenBridgeApi.destination.chainId}
                />
              );
            },
          },
        ]}
      />
    </StyledCard>
  );
}

function useStep() {
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
      const navigate = step === newStep ? history.replace : history.push;
      navigate({ ...location, search: new URLSearchParams(newQueryParams).toString() });
    },
    [history, step, queryParams, location]
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

function useStepAutoNavigation({ steps, current }) {
  React.useEffect(() => {
    if (steps?.[current]?.isDone) {
      const onDone = steps?.[current]?.onDone;
      if (onDone) {
        onDone();
      }
    }
  }, [steps, current]);
}

const StyledCard = styled(Card)`
  margin: 20px auto 0;
  max-width: 768px;
  border-radius: 12px;
  box-shadow: 0px 6px 36px #bc9cff;

  .ant-card-head {
    border: none;
  }

  .ant-card-head-title {
    text-align: center;
    font-size: 36px;
    color: #4d00b4;
    padding-bottom: 0;
  }

  .ant-card-actions {
    background: none;
    border: none;
    padding: 0 24px 20px;
    display: flex;
    gap: 16px;

    > li {
      text-align: inherit;
      border: none;
      width: auto !important;
      padding: 0;
      margin: 0;

      :last-child {
        margin-left: auto;
      }
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
