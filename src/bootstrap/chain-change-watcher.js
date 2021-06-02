import t from "prop-types";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import useReloadOnChainChanged from "../hooks/use-reload-on-chain-changed";

const { useDrizzle } = drizzleReactHooks;

export default function ChainChangeWatcher({ children }) {
  const { drizzle } = useDrizzle();
  useReloadOnChainChanged(drizzle.web3);

  return children;
}

ChainChangeWatcher.propTypes = {
  children: t.node.isRequired,
};
