import { useEffect, useRef } from "react";
import useChainId from "./use-chain-id";

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

function usePrevious(value) {
  const ref = useRef();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}
