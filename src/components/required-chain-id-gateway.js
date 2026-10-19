import React, { useEffect, useState } from "react";
import t from "prop-types";
import { useParams } from "react-router-dom";
import useChainId from "../hooks/use-chain-id";
import useAccount from "../hooks/use-account";
import { toPath } from "../helpers/chain-url";
import { SwitchingNetworkSpinner } from "./switching-network";

export default function RequiredChainIdGateway({ children, renderOnMismatch }) {
  //Pages render only under a chain route (chainRoutePath in helpers/chain-url), so the param is always one of the supported ids.
  const requiredChainId = Number(useParams().chainId);
  const chainId = useChainId();
  const account = useAccount();
  const matches = requiredChainId === chainId;
  //No chain yet means nothing to compare; ChainIdProvider renders pages only once it is known.
  const isReloading = useViewOnlyReload(!account && chainId !== undefined && !matches);

  if (isReloading) {
    return <SwitchingNetworkSpinner />;
  }

  return matches ? children : renderOnMismatch({ requiredChainId });
}

RequiredChainIdGateway.propTypes = {
  children: t.node,
  renderOnMismatch: t.func.isRequired,
};

RequiredChainIdGateway.defaultProps = {
  children: null,
};

//The URL a view-only reload was already tried for.
const VIEW_ONLY_RELOAD_KEY = "@@kleros/court/view-only-reload";

//Without a wallet the app boots on the URL's chain, so a mismatch only appears after Back or Forward to the case page
//from before a header switch (other pages follow the chain then, see CanonicalChainUrl). The switch prompt needs a
//wallet, so reload instead: boot then follows the URL.
//Tried once per URL. If boot still lands elsewhere (an RPC configured for the wrong chain, say), the page keeps today's
//mismatch rendering instead of reloading forever. "reloads at most once for the same URL" fails without this guard.
//No reload when the marker cannot be saved either: the next load could not tell it already tried.
//Returns whether to show the spinner. Once a reload is asked for, it stays until the page unloads.
function useViewOnlyReload(isNeeded) {
  const url = toPath(window.location);
  //What this page did for `url`, once it tried to save the marker: { url, isReloading }.
  const [attempt, setAttempt] = useState(null);
  const isAttempted = attempt?.url === url;
  const shouldTry = isNeeded && !isAttempted && readReloadMarker() !== url;

  useEffect(() => {
    if (shouldTry) {
      const isSaved = writeReloadMarker(url);
      setAttempt({ url, isReloading: isSaved });
      if (isSaved) {
        window.location.reload();
      }
    } else if (!isNeeded) {
      writeReloadMarker(null);
    }
  }, [shouldTry, isNeeded, url]);

  return isNeeded && (shouldTry || (isAttempted && attempt.isReloading));
}

//Session storage can be unavailable. Then it reads as "already tried", so the page never reloads without the guard.
function readReloadMarker() {
  try {
    return window.sessionStorage.getItem(VIEW_ONLY_RELOAD_KEY);
  } catch {
    return toPath(window.location);
  }
}

//Whether the write went through.
function writeReloadMarker(url) {
  try {
    if (url === null) {
      window.sessionStorage.removeItem(VIEW_ONLY_RELOAD_KEY);
    } else {
      window.sessionStorage.setItem(VIEW_ONLY_RELOAD_KEY, url);
    }
    return true;
  } catch {
    return false;
  }
}
