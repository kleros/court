import React from "react";
import styled from "styled-components/macro";
import { useHistory, useLocation } from "react-router-dom";
import { Card, Divider } from "antd";
import TokenSymbol from "../../components/token-symbol";
import SteppedContent from "../../components/stepped-content";
import { useSideChainApi } from "../../api/side-chain";
import { chainIdToNetworkShortName } from "../../helpers/networks";
import useQueryParams from "../../hooks/use-query-params";
import ConvertPnkForm from "./convert-pnk-form";

export default function ConvertPnkCard() {
  const sideChainApi = useSideChainApi();
  const { chainId, destinationChainId } = sideChainApi;

  // eslint-disable-next-line no-unused-vars
  const { step, next, first } = useStep();

  return (
    <StyledCard
      title={
        <>
          Send <TokenSymbol chainId={chainId} token="PNK" /> to {chainIdToNetworkShortName[destinationChainId]}
        </>
      }
    >
      <StyledExplainerText>
        Keep in mind that <TokenSymbol chainId={chainId} token="PNK" /> that are staked or locked cannot be sent to{" "}
        {chainIdToNetworkShortName[destinationChainId]}.
      </StyledExplainerText>
      <StyledDivider />
      <SteppedContent
        size="small"
        current={step}
        steps={[
          {
            title: "Convert",
            children() {
              return <ConvertPnkForm maxAvailable="10000000000000000000" />;
            },
          },
          {
            title: `Switch to ${chainIdToNetworkShortName[destinationChainId]}`,
            children() {
              return null;
            },
          },
          {
            title: "Claim",
            children() {
              return null;
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

const StyledDivider = styled(Divider)`
  border: none !important;
  background: none !important;
`;
