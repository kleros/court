import t from "prop-types";
import { drizzleReactHooks } from "@drizzle/react-plugin";

const { useDrizzleState } = drizzleReactHooks;

export default function TokenSymbol({ token }) {
  const { networkId } = useDrizzleState(({ web3 }) => web3);

  if (token) {
    return networkIdToTokenSuffix[networkId] && networkIdToTokenSuffix[networkId][token]
      ? networkIdToTokenSuffix[networkId][token]
      : token;
  }

  const suffix = networkIdToSuffix[networkId] || "ETH";
  return suffix;
}

TokenSymbol.propTypes = {
  token: t.string,
};

const networkIdToSuffix = {
  1: "ETH",
  3: "ETH",
  42: "ETH",
  77: "SPOA",
  100: "xDAI",
};

const networkIdToTokenSuffix = {
  1: { PNK: "PNK" },
  3: { PNK: "PNK" },
  42: { PNK: "PNK" },
  77: { PNK: "stPNK" },
  100: { PNK: "stPNK" },
};
