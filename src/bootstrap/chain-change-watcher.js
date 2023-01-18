import React, { useEffect } from "react";
import t from "prop-types";
import useChainId from "../hooks/use-chain-id";
import usePrevious from "../hooks/use-previous";
import SwitchChainFallback from "../components/error-fallback/switch-chain";
import { isSupportedChain } from "../api/side-chain";

export default function ChainChangeWatcher({ children }) {
  const chainId = useChainId();
  const isSupported = isSupportedChain(chainId);

  useReloadOnChainChanged();
  return !isSupported ? <SwitchChainFallback /> : children;
}

ChainChangeWatcher.propTypes = {
  children: t.node.isRequired,
};

function useReloadOnChainChanged() {
  const chainId = useChainId();
  const previousChainId = usePrevious(chainId);

  useEffect(() => {
    if (chainId !== undefined && previousChainId !== undefined && chainId !== previousChainId) {
      window.location.reload();
    }
  }, [previousChainId, chainId]);
}
