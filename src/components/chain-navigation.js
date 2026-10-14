import React, { useCallback } from "react";
import t from "prop-types";
import { Link, NavLink, Redirect, useHistory, useLocation } from "react-router-dom";
import useChainId from "../hooks/use-chain-id";
import { canonicalLocation, chainPath, toPath, withChainPrefix } from "../helpers/chain-url";

//Internal links follow the CONNECTED chain, not the URL's: from /100/courts with a mainnet wallet, Home is /1/.
export function useChainPath() {
  const chainId = useChainId();
  return useCallback((path) => chainPath(chainId, path), [chainId]);
}

//`to` is a chain-relative route path ("/cases/12"); the connected chain is added when the link renders,
//so module-level element arrays (menu.js) and memoized elements (case-card.js) stay correct without extra deps.
export const ChainLink = React.forwardRef(function ChainLink({ to, ...props }, ref) {
  const toChain = useChainPath();
  return <Link {...props} ref={ref} to={toChain(to)} />;
});
ChainLink.propTypes = { to: t.string.isRequired };

export const ChainNavLink = React.forwardRef(function ChainNavLink({ to, ...props }, ref) {
  const toChain = useChainPath();
  return <NavLink {...props} ref={ref} to={toChain(to)} />;
});
ChainNavLink.propTypes = { to: t.string.isRequired };

//Points the current URL at `chainId` without reloading: same page, history replace, only when the URL changes.
//Reads history.location when called, not a captured one: callers run after an awaited wallet request.
export function useReplaceChainInUrl() {
  const history = useHistory();
  return useCallback(
    (chainId) => {
      const next = withChainPrefix(history.location, chainId);
      if (toPath(next) !== toPath(history.location)) {
        history.replace(next);
      }
    },
    [history]
  );
}

//Pages only ever render under their canonical URL. Bare and legacy URLs are replaced (no history entry) before any
//page mounts; tokens and convert-pnk move to the connected chain. Redirect runs in the layout phase, so no frame paints
//under the old URL, and it unmounts after one replace because canonicalLocation is idempotent.
export function CanonicalChainUrl({ children }) {
  const location = useLocation();
  const chainId = useChainId();
  const canonical = canonicalLocation(location, chainId);
  return canonical ? <Redirect to={canonical} /> : children;
}
CanonicalChainUrl.propTypes = { children: t.node };
