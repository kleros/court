import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { useParams } from "react-router-dom";
import { Card, Spin } from "antd";
import useChainId from "../hooks/use-chain-id";
import SwitchNetworkMessage from "./switch-network-message";

export default function RequiredChainIdGateway({ children, render, renderOnMismatch }) {
  //Pages render only under a chain route (chainRoutePath in helpers/chain-url), so the param is always one of the supported ids.
  const requiredChainId = Number(useParams().chainId);
  const chainId = useChainId();
  const isReloadPending = useIsReloadPending(chainId);

  if (isReloadPending) {
    return (
      <Spin spinning tip="Switching network…">
        <div></div>
      </Spin>
    );
  }

  const content = children ?? render?.({ requiredChainId }) ?? null;

  return requiredChainId === chainId ? content : renderOnMismatch({ requiredChainId });
}

//A wallet chain change always reloads the page.
//If the URL still has the old chain, the "switch back" prompt and wrong-chain modals could flash. Show a spinner instead.
function useIsReloadPending(chainId) {
  const initialChainId = React.useRef();
  if (initialChainId.current === undefined && chainId !== undefined) {
    initialChainId.current = chainId;
  }
  return initialChainId.current !== undefined && chainId !== initialChainId.current;
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
