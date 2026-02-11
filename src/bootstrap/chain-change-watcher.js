import React, { useEffect } from "react";
import t from "prop-types";
import useChainId from "../hooks/use-chain-id";
import usePrevious from "../hooks/use-previous";
import { supportedChainIds } from "../helpers/networks";
import SwitchChainFallback from "../components/error-fallback/switch-chain";

export default function ChainChangeWatcher({ children }) {
  const chainId = useChainId();
  useReloadOnChainChanged();

  const isUnsupportedChain = chainId !== undefined && !supportedChainIds.includes(chainId);
  if (isUnsupportedChain) {
    return <SwitchChainFallback />;
  }

  return children;
}

ChainChangeWatcher.propTypes = {
  children: t.node.isRequired,
};

function useReloadOnChainChanged() {
  const chainId = useChainId();
  const previousChainId = usePrevious(chainId);

  useEffect(() => {
    const chainChanged = chainId !== undefined && previousChainId !== undefined && chainId !== previousChainId;
    const newChainIsSupported = chainId !== undefined && supportedChainIds.includes(chainId);

    //Only reload if the chain has changed and is supported
    if (chainChanged && newChainIsSupported) {
      window.location.reload();
    }
  }, [previousChainId, chainId]);
}
