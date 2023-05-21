import Archon from "@kleros/archon";
import PropTypes from "prop-types";
import { useEffect } from "react";
import { getReadOnlyRpcUrl } from "./web3";
import { useConfig } from "@usedapp/core";

const archon = new Archon(undefined, "https://ipfs.kleros.io");
export default archon;

export const ArchonInitializer = ({ children }) => {
  const config = useConfig();
  useEffect(() => {
    archon.setProvider(getReadOnlyRpcUrl({ chainId: config.readOnlyChainId }));
  }, []);
  return children;
};

ArchonInitializer.propTypes = {
  children: PropTypes.node.isRequired,
};
