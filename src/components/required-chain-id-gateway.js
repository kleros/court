import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { useHistory, useLocation } from "react-router-dom";
import { Card } from "antd";
import useQueryParams from "../hooks/use-query-params";
import useChainId from "../hooks/use-chain-id";
import SwitchNetworkMessage from "./switch-network-message";

export default function RequiredChainIdGateway({ children, render, renderOnMismatch }) {
  const queryParams = useQueryParams();
  const parsedValue = Number.parseInt(queryParams.requiredChainId, 10);
  const requiredChainId = Number.isNaN(parsedValue) ? undefined : parsedValue;

  useCleanWhenEmpty();
  useCleanWhenMatching(requiredChainId);

  const content = children ?? render?.({ requiredChainId }) ?? null;

  return requiredChainId === undefined ? content : renderOnMismatch({ requiredChainId });
}

RequiredChainIdGateway.propTypes = {
  children: t.node,
  render: t.func,
  renderOnMismatch: t.func,
};

RequiredChainIdGateway.defaultProps = {
  children: null,
  renderOnMismatch(props) {
    return <DefaultRenderOnMismatch {...props} />;
  },
};

function DefaultRenderOnMismatch({ requiredChainId }) {
  return (
    <StyledCard>
      <SwitchNetworkMessage showSwitchButton title="You are on the wrong network" wantedChainId={requiredChainId} />
    </StyledCard>
  );
}

DefaultRenderOnMismatch.propTypes = {
  requiredChainId: t.number,
};

export function useSetRequiredChainId() {
  const history = useHistory();
  const location = useLocation();
  const queryParams = useQueryParams();

  return React.useCallback(
    (requiredChainId, { location: newLocation } = {}) => {
      if (Number.isNaN(Number.parseInt(requiredChainId, 10))) {
        return;
      }

      const newLocationMixin = typeof newLocation === "string" ? { pathname: newLocation } : newLocation;

      const newQueryParams = Object.fromEntries(
        Object.entries({
          ...queryParams,
          requiredChainId,
        })
      );
      history.replace({
        ...location,
        ...newLocationMixin,
        search: new URLSearchParams(newQueryParams).toString(),
      });
    },
    [history, location, queryParams]
  );
}

export function useCleanRequiredChainId() {
  const history = useHistory();
  const location = useLocation();
  const queryParams = useQueryParams();

  return React.useCallback(() => {
    const newQueryParams = Object.fromEntries(
      Object.entries({
        ...queryParams,
      }).filter(([key, _]) => key !== "requiredChainId")
    );
    history.replace({
      ...location,
      search: new URLSearchParams(newQueryParams).toString(),
    });
  }, [history, location, queryParams]);
}

function useCleanWhenMatching(requiredChainId) {
  const chainId = useChainId();

  const clean = useCleanRequiredChainId();

  React.useEffect(() => {
    if (chainId && requiredChainId && requiredChainId === chainId) {
      clean();
    }
  }, [requiredChainId, chainId, clean]);
}

function useCleanWhenEmpty() {
  const queryParams = useQueryParams();
  const clean = useCleanRequiredChainId();

  React.useEffect(() => {
    if (queryParams.requiredChainId === "") {
      clean();
    }
  }, [queryParams.requiredChainId, clean]);
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
