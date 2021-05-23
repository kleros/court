import { useEffect, useState } from "react";

export default function useChainId(web3) {
  const [chainId, setChainId] = useState();

  useEffect(() => {
    let isMounted = true;

    async function getChainId() {
      if (isMounted) {
        const chainIdFromProvider = await web3.eth.getChainId();
        setChainId(chainIdFromProvider);
      }
    }

    getChainId();

    return () => {
      isMounted = false;
    };
  }, [web3]);

  useEffect(() => {
    let isMounted = true;

    const handleNetworkChanged = (chainIdFromEvent) => {
      // chainChanged payload is the chain ID in hex format.
      const normalizedChainId = Number.parseInt(chainIdFromEvent, 16);
      setChainId(normalizedChainId);
    };

    if (window.ethereum && isMounted) {
      window.ethereum.addListener("chainChanged", handleNetworkChanged);

      return () => {
        window.ethereum.removeListener("chainChanged", handleNetworkChanged);
        isMounted = false;
      };
    }
  }, []);

  return chainId;
}
