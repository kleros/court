import React from "react";
import t from "prop-types";
import { useParams } from "react-router-dom";
import { Spin } from "antd";
import useChainId from "../hooks/use-chain-id";

export default function RequiredChainIdGateway({ children, renderOnMismatch }) {
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

  return requiredChainId === chainId ? children : renderOnMismatch({ requiredChainId });
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
  renderOnMismatch: t.func.isRequired,
};

RequiredChainIdGateway.defaultProps = {
  children: null,
};
