import React, { useCallback, useEffect, useRef } from "react";
import t from "prop-types";
import { Link, NavLink, Redirect, useHistory, useLocation } from "react-router-dom";
import useChainId from "../hooks/use-chain-id";
import { canonicalLocation, chainPath, isBackForwardLoad, toPath, withChainPrefix } from "../helpers/chain-url";

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
//Back or Forward to a path this page has not shown yet moves every page but the case page to the connected chain: such
//an entry was visited before a chain switch, which reloads. Every path the page did show keeps its chain: the link it
//opened on, a URL the app pointed at another chain to ask for a switch, and those paths with only the hash edited.
//Paths are compared, not history entries, because entries the browser makes (a typed URL, a hash edited in the address
//bar) have no router key. When Back or Forward loaded the page itself, its first path is a history move too.
export function CanonicalChainUrl({ children }) {
  const history = useHistory();
  const location = useLocation();
  const chainId = useChainId();
  //Every path a page was shown under, after any redirect. Before the first one, only a page loaded by Back or Forward
  //counts as a history move (Back pressed while the app was still loading keeps today's prompt).
  const shownPaths = useRef(new Set());
  const isHistoryMove =
    history.action === "POP" &&
    (shownPaths.current.size === 0 ? isBackForwardLoad() : !shownPaths.current.has(location.pathname));
  const canonical = canonicalLocation(location, chainId, isHistoryMove);
  const isCanonical = canonical === null;

  useEffect(() => {
    if (isCanonical) {
      shownPaths.current.add(location.pathname);
    }
  }, [isCanonical, location.pathname]);

  return canonical ? <Redirect to={canonical} /> : children;
}
CanonicalChainUrl.propTypes = { children: t.node };
