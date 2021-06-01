import React, { createContext, useContext, useMemo } from "react";
import t from "prop-types";
import { Alert, Spin } from "antd";
import usePromise from "../../hooks/use-promise";
import createTokenBridgeApi from "./create-token-bridge-api";

const TokenBridgeApiContext = createContext({});

export function useTokenBridgeApi() {
  return useContext(TokenBridgeApiContext);
}

export function TokenBridgeApiProvider({ web3Provider, children, renderOnLoading, renderOnError }) {
  const p = useMemo(() => createTokenBridgeApi(web3Provider), [web3Provider]);
  const tokenBridgeApi = usePromise(p);

  const contentOnLoading = tokenBridgeApi.isPending
    ? typeof renderOnLoading === "function"
      ? renderOnLoading()
      : renderOnLoading
    : null;
  const contentOnError = tokenBridgeApi.isRejected
    ? typeof renderOnError === "function"
      ? renderOnError(tokenBridgeApi.reason)
      : renderOnError
    : null;

  return (
    <>
      {tokenBridgeApi.isPending ? (
        contentOnLoading
      ) : tokenBridgeApi.isFulfilled ? (
        <TokenBridgeApiContext.Provider value={tokenBridgeApi.value}>{children}</TokenBridgeApiContext.Provider>
      ) : (
        contentOnError
      )}
    </>
  );
}

TokenBridgeApiProvider.propTypes = {
  web3Provider: t.object.isRequired,
  children: t.node.isRequired,
  renderOnLoading: t.oneOfType([t.node, t.func]),
  renderOnError: t.oneOfType([t.node, t.func]),
};

const defaultRenderOnError = (error) => <Alert type="error" message={error.message} />;

TokenBridgeApiProvider.defaultProps = {
  renderOnLoading: (
    <Spin spinning tip="Initializing token bridge API...">
      <div></div>
    </Spin>
  ),
  renderOnError: defaultRenderOnError,
};
