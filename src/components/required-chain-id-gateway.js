import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { useHistory, useLocation } from "react-router-dom";
import { Card } from "antd";
import useQueryParams from "../hooks/use-query-params";
import useChainId from "../hooks/use-chain-id";
import SwitchNetworkMessage from "./switch-network-message";

export default function RequiredChainIdGateway({ children, render, renderOnMismatch, keepChainIdInUrl }) {
  const queryParams = useQueryParams();
  const parsedValue = Number.parseInt(queryParams.requiredChainId, 10);
  const requiredChainId = Number.isNaN(parsedValue) ? undefined : parsedValue;
  const chainId = useChainId();

  useClearWhenInvalid();
  useSyncRequiredChainId({ chainId, requiredChainId, keepChainIdInUrl });

  const content = children ?? render?.({ requiredChainId }) ?? null;

  return requiredChainId === undefined || requiredChainId === chainId ? content : renderOnMismatch({ requiredChainId });
}

RequiredChainIdGateway.propTypes = {
  children: t.node,
  render: t.func,
  renderOnMismatch: t.func,
  keepChainIdInUrl: t.bool,
};

RequiredChainIdGateway.defaultProps = {
  children: null,
  renderOnMismatch(props) {
    return <DefaultRenderOnMismatch {...props} />;
  },
  keepChainIdInUrl: false,
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

export function useClearRequiredChainId() {
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

function useSyncRequiredChainId({ chainId, requiredChainId, keepChainIdInUrl }) {
  const clear = useClearRequiredChainId();
  const setRequiredChainId = useSetRequiredChainId();

  React.useEffect(() => {
    //Without a `chainID`, there's nothing to sync. Without this guard, undefined would get compared to undefined, and we'd get an infinite loop.
    if (!chainId) {
      return;
    }

    //Keep the chain in the URL, so a copied link opens the case on the correct chain. Only used in the case page, currently.
    if (keepChainIdInUrl) {
      //Only add the param when it is missing. Overwriting would silently open the wrong case instead of asking to switch.
      if (requiredChainId === undefined) {
        setRequiredChainId(chainId);
      }
    } else if (requiredChainId === chainId) {
      //The param is not needed in this scenario.
      clear();
    }
  }, [keepChainIdInUrl, chainId, requiredChainId, clear, setRequiredChainId]);
}

function useClearWhenInvalid() {
  const clear = useClearRequiredChainId();
  const { requiredChainId } = useQueryParams();

  React.useEffect(() => {
    if (requiredChainId !== undefined && Number.isNaN(Number.parseInt(requiredChainId, 10))) {
      clear();
    }
  }, [requiredChainId, clear]);
}

const StyledCard = styled(Card)`
  margin: 20px auto 0;
  max-width: 768px;
  border-radius: 12px;
  box-shadow: ${({ theme }) => theme.cardShadow};

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
