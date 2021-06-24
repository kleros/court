import React, { useEffect, useState, createContext, useContext } from "react";
import { Alert, Spin } from "antd";
import t from "prop-types";

const ChainIdContext = createContext();

export default function useChainId() {
  return useContext(ChainIdContext);
}

export function ChainIdProvider({ web3Provider, children, renderOnError, renderOnLoading }) {
  const [chainId, setChainId] = useState();
  const [error, setError] = useState();

  useEffect(() => {
    let isMounted = true;

    async function getChainId() {
      try {
        const chainIdFromProvider = await web3Provider.request({
          method: "eth_chainId",
        });

        if (isMounted) {
          setChainId(hexStringToNumber(chainIdFromProvider));
        }
      } catch (err) {
        if (isMounted) {
          setError(err);
        }
      }
    }

    getChainId();

    return () => {
      isMounted = false;
    };
  }, [web3Provider]);

  useEffect(() => {
    if (typeof web3Provider.on !== "function") {
      return;
    }

    let isMounted = true;

    const handleNetworkChanged = (chainIdFromEvent) => {
      // chainChanged payload is the chain ID in hex format.
      const normalizedChainId = hexStringToNumber(chainIdFromEvent);

      if (isMounted) {
        setChainId(normalizedChainId);
      }
    };

    web3Provider.on("chainChanged", handleNetworkChanged);

    return () => {
      web3Provider.off("chainChanged", handleNetworkChanged);
      isMounted = false;
    };
  }, [web3Provider]);

  const errorContent = error ? (typeof renderOnError === "function" ? renderOnError(error) : renderOnError) : null;
  const loadingContent =
    chainId === undefined ? (typeof renderOnLoading === "function" ? renderOnLoading() : renderOnLoading) : null;

  return (
    <ChainIdContext.Provider value={chainId}>{errorContent ?? loadingContent ?? children}</ChainIdContext.Provider>
  );
}

const defaultRenderOnLoading = (
  <Spin spinning tip="Getting chain info...">
    <div></div>
  </Spin>
);

const defaultRenderOnError = (error) => <Alert type="error" message={error.message} />;

ChainIdProvider.propTypes = {
  web3Provider: t.shape({
    request: t.func.isRequired,
    on: t.func,
    off: t.func,
  }).isRequired,
  renderOnLoading: t.oneOfType([t.node, t.func]),
  renderOnError: t.oneOfType([t.node, t.func]),
  children: t.node,
};

ChainIdProvider.defaultProps = {
  renderOnLoading: defaultRenderOnLoading,
  renderOnError: defaultRenderOnError,
};

const hexStringToNumber = (chainId) => Number.parseInt(chainId, 16);
