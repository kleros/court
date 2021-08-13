import React from "react";
import styled from "styled-components/macro";
import { Link, useHistory, useLocation } from "react-router-dom";
import { Card, Divider } from "antd";
import { ButtonLink } from "../../adapters/antd";
import TokenSymbol from "../../components/token-symbol";
import SteppedContent from "../../components/stepped-content";
import { getCounterPartyChainId, isSupportedMainChain, isSupportedSideChain } from "../../api/side-chain";
import { chainIdToNetworkShortName } from "../../helpers/networks";
import useChainId from "../../hooks/use-chain-id";
import useQueryParams from "../../hooks/use-query-params";
import ConvertPnkForm from "./convert-pnk-form";
import SwitchChainButton from "./switch-chain-button";
import ClaimTokensButton from "./claim-tokens-button";

export default function ConvertPnkCard() {
  const currentChainId = useChainId();
  const counterPartyChainId = getCounterPartyChainId(currentChainId);

  const originChainId = isSupportedMainChain(counterPartyChainId) ? currentChainId : counterPartyChainId;
  const targetChainId = isSupportedMainChain(counterPartyChainId) ? counterPartyChainId : currentChainId;

  const { step, next, first } = useStep();

  const handleFormDone = React.useCallback(() => {
    next();
  }, [next]);

  React.useEffect(() => {
    if (step === 1 && isSupportedMainChain(currentChainId)) {
      next();
    }
  }, [step, currentChainId, next]);

  React.useEffect(() => {
    if (step === 2 && isSupportedSideChain(currentChainId)) {
      first();
    }
  }, [step, currentChainId, first]);

  return (
    <StyledCard
      title={
        <>
          Send <TokenSymbol chainId={originChainId} token="PNK" /> to {chainIdToNetworkShortName[targetChainId]}
        </>
      }
    >
      <StyledExplainerText
        css={`
          margin-top: -1rem;
        `}
      >
        Keep in mind that <TokenSymbol chainId={originChainId} token="PNK" /> that are staked or locked cannot be sent
        to {chainIdToNetworkShortName[targetChainId]}.
      </StyledExplainerText>
      <StyledDivider />
      <SteppedContent
        size="small"
        current={step}
        renderFinalContent={() => (
          <div
            css={`
              text-align: center;
            `}
          >
            <StyledFinalMessage>
              <span role="img" aria-label="Party popper emoji">
                🎉
              </span>{" "}
              You have successfully sent your <TokenSymbol chainId={originChainId} token="PNK" /> to{" "}
              {chainIdToNetworkShortName[targetChainId]}!{" "}
              <span role="img" aria-label="Party popper emoji">
                🎉
              </span>
            </StyledFinalMessage>
            <Link to="/" component={ButtonLink}>
              Go to the Home Page
            </Link>
          </div>
        )}
        steps={[
          {
            title: (
              <>
                Convert <TokenSymbol chainId={originChainId} token="PNK" />
              </>
            ),
            children() {
              return isSupportedSideChain(currentChainId) ? (
                <ConvertPnkForm onDone={handleFormDone} />
              ) : (
                <SwitchChainButton destinationChainId={originChainId} />
              );
            },
          },
          {
            title: `Switch to ${chainIdToNetworkShortName[targetChainId]}`,
            children() {
              return <SwitchChainButton destinationChainId={targetChainId} />;
            },
          },
          {
            title: (
              <>
                Claim <TokenSymbol chainId={targetChainId} token="PNK" />
              </>
            ),
            children() {
              return <ClaimTokensButton onDone={next} />;
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

const StyledExplainerText = styled.p`
  color: rgba(0, 0, 0, 0.45);
  font-size: 14px;
  text-align: center;
`;

const StyledFinalMessage = styled.p`
  color: rgba(0, 0, 0, 0.85);
  font-size: 24px;
  font-weight: bold;
  text-align: center;
  margin: 0;
  padding: 1rem 0;
`;

const StyledDivider = styled(Divider)`
  border: none !important;
  background: none !important;
`;
