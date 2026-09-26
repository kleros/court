import React, { useEffect } from "react";
import t from "prop-types";
import useChainId from "../hooks/use-chain-id";
import usePrevious from "../hooks/use-previous";
import { supportedChainIds } from "../helpers/networks";
import { withRequiredChainId } from "../helpers/required-chain-id";
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
      //If the URL has the `requiredChainId` query param, point it at the new chain before reloading.
      //Otherwise the reload lands on the old chain and asks the user to switch back.
      const nextUrl = withRequiredChainId(window.location.href, chainId);
      if (nextUrl !== window.location.href) {
        window.history.replaceState(window.history.state, "", nextUrl);
      }
      window.location.reload();
    }
  }, [previousChainId, chainId]);
}
