import t, { PropTypes } from "prop-types";

export function getTokenSymbol(chainId, token) {
  if (token) {
    return chainIdToTokenSuffix[chainId] && chainIdToTokenSuffix[chainId][token]
      ? chainIdToTokenSuffix[chainId][token]
      : token;
  }

  const suffix = chainIdToSuffix[chainId] || "ETH";
  return suffix;
}

getTokenSymbol.propTypes = {
  chainId: PropTypes.number.isRequired,
  token: t.string,
};

const chainIdToSuffix = {
  1: "ETH",
  5: "gETH",
  100: "xDAI",
  10200: "xDAI",
  11155111: "sETH",
};

const chainIdToTokenSuffix = {
  1: { PNK: "PNK", xPNK: "<<Invalid>>" },
  5: { PNK: "PNK", xPNK: "<<Invalid>>" },
  100: { PNK: "stPNK", xPNK: "PNK" },
  10200: { PNK: "stPNK", xPNK: "PNK" },
  11155111: { PNK: "PNK", xPNK: "<<Invalid>>" },
};
