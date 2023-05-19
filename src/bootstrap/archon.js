import Archon from "@kleros/archon";
import PropTypes from "prop-types";
import { useEffect } from "react";
import { getReadOnlyRpcUrl } from "./web3";

const archon = new Archon(undefined, "https://ipfs.kleros.io");
export default archon;

export const ArchonInitializer = ({ children }) => {
  useEffect(() => {
    archon.setProvider(getReadOnlyRpcUrl({ chainId: 1 }));
  }, []);
  return children;
};

ArchonInitializer.propTypes = {
  children: PropTypes.node.isRequired,
};
