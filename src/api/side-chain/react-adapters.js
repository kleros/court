import React, { createContext, useContext, useMemo } from "react";
import t from "prop-types";
import { Alert, Spin } from "antd";
import usePromise from "../../hooks/use-promise";
import createSideChainApi from "./create-side-chain-api";

const SideChainApiContext = createContext({});

export function useSideChainApi() {
  return useContext(SideChainApiContext);
}

export function SideChainApiProvider({ web3Provider, children, renderOnLoading, renderOnError }) {
  const p = useMemo(() => createSideChainApi(web3Provider), [web3Provider]);
  const sideChainApi = usePromise(p);

  const contentOnLoading = sideChainApi.isPending
    ? typeof renderOnLoading === "function"
      ? renderOnLoading()
      : renderOnLoading
    : null;
  const contentOnError = sideChainApi.isRejected
    ? typeof renderOnError === "function"
      ? renderOnError(sideChainApi.reason)
      : renderOnError
    : null;

  return (
    <>
      {sideChainApi.isPending ? (
        contentOnLoading
      ) : sideChainApi.isFulfilled ? (
        <SideChainApiContext.Provider value={sideChainApi.value}>{children}</SideChainApiContext.Provider>
      ) : (
        contentOnError
      )}
    </>
  );
}

SideChainApiProvider.propTypes = {
  web3Provider: t.object.isRequired,
  children: t.node.isRequired,
  renderOnLoading: t.oneOfType([t.node, t.func]),
  renderOnError: t.oneOfType([t.node, t.func]),
};

const defaultRenderOnLoading = (
  <Spin spinning tip="Initializing side chain API...">
    <div></div>
  </Spin>
);

const defaultRenderOnError = (error) => <Alert type="error" message={error.message} />;

SideChainApiProvider.defaultProps = {
  renderOnLoading: defaultRenderOnLoading,
  renderOnError: defaultRenderOnError,
};
