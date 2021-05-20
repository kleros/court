import { useMemo } from "react";
import { getReadOnlyWeb3 } from "../bootstrap/web3";

export default function useReadOnlyWeb3(chainId) {
  const web3 = useMemo(() => {
    if (chainId) {
      return getReadOnlyWeb3(chainId);
    }
  }, [chainId]);
  return web3;
}
