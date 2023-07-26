import { useEffect, useRef, useState } from "react";
import Dataloader from "dataloader";
import { getReadOnlyRpcUrl } from "./web3";
import axios from "axios";
import useSWR from "swr";

const subgraphURL = "https://api.thegraph.com/subgraphs/name";

const displaySubgraph = {
  1: "andreimvp/kleros-display-mainnet",
  100: "andreimvp/kleros-display",
};

const getURIProtocol = (uri) => {
  const uriParts = uri.replace(":", "").split("/");
  switch (uri.substr(0, 1)) {
    case "/":
      return uriParts[1];
    default:
      return uriParts[0];
  }
};

const getHttpUri = (uri) => {
  const protocol = getURIProtocol(uri);
  switch (protocol) {
    case "http":
    case "https":
    case "ipns":
      break;
    case "fs":
      if (uri.includes("/ipfs/")) uri = uri.split(":/").pop();
      else throw new Error(`Unrecognized protocol ${protocol}`);
      break;
    case "ipfs":
      uri = uri.replace("://", ":/");
      if (uri.substr(0, 5) === "/ipfs" || uri.substr(0, 5) === "ipfs/") {
        if (uri.substr(0, 1) === "/") uri = uri.substr(1, uri.length - 1);
        uri = `https://ipfs.kleros.io/${uri}`;
      } else if (uri.substr(0, 6) === "ipfs:/") uri = `https://ipfs.kleros.io/${uri.split(":/").pop()}`;
      else throw new Error(`Unrecognized protocol ${protocol}`);
      break;
    default:
      throw new Error(`Unrecognized protocol ${protocol}`);
  }

  return uri;
};

const fetchDataFromScript = async (scriptString, scriptParameters) => {
  const { default: iframe } = await import("iframe");

  let resolver;
  const returnPromise = new Promise((resolve) => {
    resolver = resolve;
  });

  window.onmessage = (message) => {
    if (message.data.target === "script") {
      resolver(message.data.result);
    }
  };

  const frameBody = `<script type='text/javascript'>
    const scriptParameters = ${JSON.stringify(scriptParameters)}
    let resolveScript
    let rejectScript
    const returnPromise = new Promise((resolve, reject) => {
      resolveScript = resolve
      rejectScript = reject
    })

    returnPromise.then(result => {window.parent.postMessage(
      {
        target: 'script',
        result
      },
      '*'
    )})

    ${scriptString}
    getMetaEvidence()
  </script>`;

  const _ = iframe({
    body: frameBody,
    sandboxAttributes: ["allow-same-origin", "allow-scripts"],
  });
  _.iframe.style.display = "none";
  return returnPromise;
};

const funcs = {
  async getMetaEvidence(chainID, arbitrated, arbitrator, disputeId) {
    try {
      const metaEvidenceUriData = await axios.get(
        `https://lemon.kleros.io/.netlify/functions/get-metaevidence?chainId=${chainID}&disputeId=${disputeId}`
      );

      const uri = metaEvidenceUriData.data?.metaEvidenceUri;
      if (!uri) throw new Error(`No MetaEvidence log for disputeId ${disputeId} on chainID ${chainID}`);

      let metaEvidenceJSON = (await axios.get(getHttpUri(uri))).data;

      const updateDict = {
        evidenceDisplayInterfaceURL: "evidenceDisplayInterfaceURI",
        evidenceDisplayInterfaceURLHash: "evidenceDisplayInterfaceHash",
      };

      const replacePairs = Object.entries(updateDict);
      for (const [legacyKey, updatedKey] of replacePairs) {
        if (!metaEvidenceJSON[legacyKey]) continue;
        const value = metaEvidenceJSON[legacyKey];
        delete metaEvidenceJSON[legacyKey];
        metaEvidenceJSON[updatedKey] = value;
      }

      if (metaEvidenceJSON.rulingOptions && !metaEvidenceJSON.rulingOptions.type)
        metaEvidenceJSON.rulingOptions.type = "single-select";

      if (metaEvidenceJSON.dynamicScriptURI) {
        const scriptURI = getHttpUri(metaEvidenceJSON.dynamicScriptURI);

        const fileResponse = await axios.get(scriptURI);

        if (fileResponse.status !== 200) throw new Error(`Unable to fetch dynamic script file at ${scriptURI}.`);

        const injectedParameters = {
          arbitratorChainID: metaEvidenceJSON.arbitratorChainID || chainID,
          arbitrableChainID: metaEvidenceJSON.arbitrableChainID || chainID,
        };

        injectedParameters.arbitrableContractAddress = injectedParameters.arbitrableContractAddress || arbitrated;
        injectedParameters.arbitratorJsonRpcUrl =
          injectedParameters.arbitratorJsonRpcUrl || getReadOnlyRpcUrl(injectedParameters.arbitratorChainID);
        injectedParameters.arbitrableChainID = injectedParameters.arbitrableChainID || arbitrator;
        injectedParameters.arbitrableJsonRpcUrl =
          injectedParameters.arbitrableJsonRpcUrl || getReadOnlyRpcUrl(injectedParameters.arbitrableChainID);

        if (
          injectedParameters.arbitratorChainID !== undefined &&
          injectedParameters.arbitratorJsonRpcUrl === undefined
        ) {
          console.warn(
            `Could not obtain a valid 'arbitratorJsonRpcUrl' for chain ID ${injectedParameters.arbitratorChainID} on the Arbitrator side.`
          );
        }

        if (
          injectedParameters.arbitrableChainID !== undefined &&
          injectedParameters.arbitrableJsonRpcUrl === undefined
        ) {
          console.warn(
            `Could not obtain a valid 'arbitrableJsonRpcUrl' for chain ID ${injectedParameters.arbitrableChainID} on the Arbitrable side.`
          );
        }

        const metaEvidenceEdits = await fetchDataFromScript(fileResponse.data, injectedParameters);

        metaEvidenceJSON = {
          ...metaEvidenceJSON,
          ...metaEvidenceEdits,
        };
      }

      return metaEvidenceJSON;
    } catch (err) {
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
  async loadPolicy(URI) {
    URI = `https://ipfs.kleros.io${URI.startsWith("/ipfs/") ? URI : `/ipfs/${URI}`}`;

    try {
      const res = await axios.get(URI);

      if (res.status !== 200)
        throw new Error(`HTTP Error: Unable to fetch file at ${URI}. Returned status code ${res.status}`);

      return res.data;
    } catch {
      return {
        description: "Please contact the governance team.",
        name: "Invalid Court Data",
        summary:
          "The data for this court is not formatted correctly or has been tampered since the time of its submission.",
      };
    }
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

const evidenceFetcher = async ([subgraph, disputeId]) => {
  const evidence = await axios
    .post(
      `${subgraphURL}/${subgraph}`,
      {
        query: `
        query getDispute($id: String!) {
          dispute(id: $id) {
            evidenceGroup {
              evidence {
                URI
                sender
                creationTime
              }
            }
          }
        }
      `,
        variables: { id: disputeId },
      },
      { headers: { "Content-Type": "application/json" } }
    )
    .then((res) => res.data.data.dispute.evidenceGroup.evidence);

  return await Promise.all(
    evidence.map(async (evidenceItem) => {
      const uri = getHttpUri(evidenceItem.URI);

      const fileRes = await axios.get(uri);

      if (fileRes.status !== 200)
        throw new Error(`HTTP Error: Unable to fetch file at ${uri}. Returned status code ${fileRes.status}`);

      return {
        evidenceJSON: fileRes.data,
        submittedAt: evidenceItem.creationTime,
        submittedBy: evidenceItem.sender,
      };
    })
  );
};

export function useEvidence(chainId, disputeID) {
  const { data } = useSWR(chainId && disputeID ? [displaySubgraph[chainId], disputeID] : null, evidenceFetcher, {
    revalidateOnReconnect: false,
  });

  return data;
}

export const VIEW_ONLY_ADDRESS = "0x0000000000000000000000000000000000000000";
