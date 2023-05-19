import Dataloader from "dataloader";
import { useEffect, useRef, useState } from "react";
import archon from "./archon";
import { getReadOnlyRpcUrl } from "./web3";

const funcs = {
  getAppealDecision: (arbitratorAddress, disputeID, appeal, options) =>
    archon.arbitrator
      .getAppealDecision(arbitratorAddress, disputeID, appeal, {
        ...options,
      })
      .catch(() => ({
        appealedAt: null,
      })),
  getDisputeCreation: (arbitratorAddress, disputeID, options) =>
    archon.arbitrator.getDisputeCreation(arbitratorAddress, disputeID, {
      ...options,
    }),
  getEvidence: (contractAddress, arbitratorAddress, disputeID, options) =>
    archon.arbitrable
      .getDispute(contractAddress, arbitratorAddress, disputeID, {
        ...options,
      })
      .then((d) =>
        archon.arbitrable.getEvidence(contractAddress, arbitratorAddress, d.evidenceGroupID, {
          ...options,
        })
      )
      .then((evidence) => evidence.filter((e) => e.evidenceJSONValid && (!e.evidenceJSON.fileURI || e.fileValid))),
  async getMetaEvidence(arbitratorChainID, contractAddress, arbitratorAddress, disputeID, options) {
    try {
      const dispute = await archon.arbitrable.getDispute(contractAddress, arbitratorAddress, disputeID, { ...options });

      const metaEvidence = await archon.arbitrable.getMetaEvidence(
        contractAddress,
        disputeID === "560" ? "2" : dispute.metaEvidenceID,
        {
          strict: true,
          getJsonRpcUrl: (chainId) => getReadOnlyRpcUrl({ chainId }),
          scriptParameters: {
            disputeID,
            arbitratorChainID,
            arbitratorContractAddress: arbitratorAddress,
            // arbitrableContractAddress is injected automatically by archon
          },
          ...options,
        }
      );

      return metaEvidence;
    } catch (err) {
      // handle error...
      console.warn("Failed to get the evidence:", err);
      return {
        metaEvidenceJSON: {
          description:
            "The data for this case is not formatted correctly or has been tampered since the time of its submission. Please refresh the page and refuse to arbitrate if the problem persists.",
          title: "Invalid or tampered case data, refuse to arbitrate.",
        },
      };
    }
  },
  loadPolicy: (URI, options) => {
    console.log("URI", URI);
    if (!options) options = {};
    if (URI.startsWith("/ipfs/")) options.preValidated = true;

    return archon.utils
      .validateFileFromURI(URI.replace(/^\/ipfs\//, "https://ipfs.kleros.io/ipfs/"), {
        ...options,
      })
      .then((res) => res.file)
      .catch(() => ({
        description: "Please contact the governance team.",
        name: "Invalid Court Data",
        summary:
          "The data for this court is not formatted correctly or has been tampered since the time of its submission.",
      }));
  },
};
export const dataloaders = Object.keys(funcs).reduce((acc, f) => {
  acc[f] = new Dataloader((argsArr) => Promise.all(argsArr.map((args) => funcs[f](...args))), {
    cacheKeyFn: JSON.stringify,
  });
  return acc;
}, {});

export const useDataloader = Object.keys(dataloaders).reduce((acc, f) => {
  acc[f] = function useData() {
    const [state, setState] = useState({});
    const loadedRef = useRef({});

    let mounted = useRef(true);

    useEffect(() => () => (mounted.current = false), []);

    return (...args) => {
      const key = JSON.stringify(args);
      return loadedRef.current[key]
        ? state[key]
        : dataloaders[f].load(args).then((res) => {
            if (mounted.current) {
              loadedRef.current[key] = true;
              setState((state) => ({ ...state, [key]: res }));
            }
          }) && undefined;
    };
  };

  Object.defineProperty(acc[f], "name", { value: f });

  return acc;
}, {});

export const VIEW_ONLY_ADDRESS = "0x0000000000000000000000000000000000000000";
