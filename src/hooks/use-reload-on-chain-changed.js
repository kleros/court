import { useEffect } from "react";
import useChainId from "./use-chain-id";
import usePrevious from "./use-previous";

export default function useReloadOnChainChanged(web3) {
  const chainId = useChainId(web3);
  const previousChainId = usePrevious(chainId);

  useEffect(() => {
    if (previousChainId !== undefined) {
      console.info("Chain ID changed:", chainId);
      window.location.reload();
    }
  }, [previousChainId, chainId]);
}
