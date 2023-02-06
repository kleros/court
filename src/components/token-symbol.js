import React from "react";
import t from "prop-types";
import { drizzleReactHooks } from "@drizzle/react-plugin";

const { useDrizzleState } = drizzleReactHooks;

export default function TokenSymbol({ chainId, token }) {
  if (token) {
    return chainIdToTokenSuffix[chainId] && chainIdToTokenSuffix[chainId][token]
      ? chainIdToTokenSuffix[chainId][token]
      : token;
  }

  const suffix = chainIdToSuffix[chainId] || "ETH";
  return suffix;
}

TokenSymbol.propTypes = {
  token: t.string,
};

export function AutoDetectedTokenSymbol({ token }) {
  const chainId = useDrizzleState((ds) => ds.web3.networkId);

  return <TokenSymbol chainId={chainId} token={token} />;
}

AutoDetectedTokenSymbol.propTypes = {
  token: t.string,
};

const chainIdToSuffix = {
  1: "ETH",
  5: "gETH",
  100: "xDAI",
  10200: "xDAI",
};

const chainIdToTokenSuffix = {
  1: { PNK: "PNK", xPNK: "<<Invalid>>" },
  5: { PNK: "PNK", xPNK: "<<Invalid>>" },
  100: { PNK: "stPNK", xPNK: "PNK" },
  10200: { PNK: "stPNK", xPNK: "PNK" },
};
