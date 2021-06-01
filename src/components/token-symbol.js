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
  3: "ETH",
  42: "ETH",
  77: "SPOA",
  100: "xDAI",
};

const chainIdToTokenSuffix = {
  1: { PNK: "PNK" },
  3: { PNK: "PNK" },
  42: { PNK: "PNK" },
  77: { PNK: "stPNK" },
  100: { PNK: "stPNK" },
};
