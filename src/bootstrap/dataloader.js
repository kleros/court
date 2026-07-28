import { useEffect, useRef, useState } from "react";
import Dataloader from "dataloader";
import { getReadOnlyRpcUrl } from "./web3";
import axios from "axios";
import useSWR from "swr";
import arbitrableWhitelist from "../temp/arbitrable-whitelist";
import { displaySubgraph } from "./subgraph";
import { isContentAddressed, toHttpUrl } from "../utils/ipfs";

const getURIProtocol = (uri) => {
  const uriParts = uri.replace(":", "").split("/");
  return uri.startsWith("/") ? uriParts[1] : uriParts[0];
};

const getHttpUri = (uri) => {
  if (isContentAddressed(uri)) return toHttpUrl(uri);

  const protocol = getURIProtocol(uri);
  switch (protocol) {
    case "http":
    case "https":
    case "ipns":
      return uri;
    default:
      throw new Error(`Unrecognized protocol ${protocol}`);
  }
};

const META_EVIDENCE_CACHE_PREFIX = "@@kleros/court/metaevidence/v1";

const metaEvidenceCacheKey = (chainID, arbitrator, disputeId) =>
  `${META_EVIDENCE_CACHE_PREFIX}/${chainID}/${arbitrator}/${disputeId}`;

//MetaEvidence must be an object with at least a title or rulingOptions.
const isValidMetaEvidence = (metaEvidenceJSON) =>
  Boolean(metaEvidenceJSON) &&
  typeof metaEvidenceJSON === "object" &&
  Boolean(metaEvidenceJSON.title || metaEvidenceJSON.rulingOptions);

const readCachedMetaEvidence = (chainID, arbitrator, disputeId) => {
  const cacheKey = metaEvidenceCacheKey(chainID, arbitrator, disputeId);

  try {
    const cached = window.localStorage.getItem(cacheKey);
    if (!cached) return undefined;

    const parsed = JSON.parse(cached);
    if (isValidMetaEvidence(parsed)) return parsed;
  } catch {
    //Unparsable entry, clean up will happen next.
  }

  try {
    window.localStorage.removeItem(cacheKey);
  } catch {
    //Storage unavailable, so nothing to clean up.
  }
  return undefined;
};

const writeCachedMetaEvidence = (chainID, arbitrator, disputeId, metaEvidenceJSON) => {
  //A malformed response, even with status 200 must not be cached
  if (!isValidMetaEvidence(metaEvidenceJSON)) return;

  try {
    window.localStorage.setItem(metaEvidenceCacheKey(chainID, arbitrator, disputeId), JSON.stringify(metaEvidenceJSON));
  } catch {
    //Caching is best-effort
  }
};

//Each concurrent fetch spawns its own iframe, so responses are tagged with a target counter.
//Previously, the single shared `window.onmessage` handler would get flooded by calls,
//and it would leave earlier cases, for which the fetch had finished, hanging, possibly forever if one of the other requests failed.
let dynamicScriptTargetCounter = 0;

//A script that errors inside its iframe never posts a result, which would leave the promise, the
//listener and the iframe allocated forever. The timeout must exceed getMetaEvidence's retry window
//so a timed-out scan falls out of the retry loop instead of being re-run from scratch.
const DYNAMIC_SCRIPT_TIMEOUT_MS = 180000;

const fetchDataFromScript = async (scriptString, scriptParameters) => {
  const { default: iframe } = await import("iframe");

  const messageTarget = `script-${dynamicScriptTargetCounter++}`;

  let resolver;
  let rejecter;
  const returnPromise = new Promise((resolve, reject) => {
    resolver = resolve;
    rejecter = reject;
  });

  const cleanup = () => {
    clearTimeout(timeoutId);
    window.removeEventListener("message", handleScriptMessage);
    _.iframe.remove();
  };

  const handleScriptMessage = (message) => {
    //Only accept results posted by this request's own iframe.
    if (message.source === _.iframe.contentWindow && message.data?.target === messageTarget) {
      cleanup();
      resolver(message.data.result);
    }
  };
  window.addEventListener("message", handleScriptMessage);

  const timeoutId = setTimeout(() => {
    cleanup();
    rejecter(new Error(`The dynamic script for dispute ${scriptParameters.disputeID} timed out.`));
  }, DYNAMIC_SCRIPT_TIMEOUT_MS);
  const frameBody = `<script type='text/javascript'>
  (function rpcRedirectPatch() {
    const OLD_RPC = "https://mainnet.infura.io/v3/668b3268d5b241b5bab5c6cb886e4c61";
    const NEW_RPC = ${JSON.stringify(getReadOnlyRpcUrl(scriptParameters.arbitrableChainID))};

    // Patch XMLHttpRequest (web3 v1)
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      if (typeof url === "string" && url === OLD_RPC) {
        console.warn("[iframe RPC redirect][XHR]", url, "→", NEW_RPC);
        url = NEW_RPC;
      }
      return originalOpen.call(this, method, url, ...rest);
    };

    // Patch fetch (fallback)
    if (window.fetch) {
      const originalFetch = window.fetch;
      window.fetch = function(input, init) {
        if (typeof input === "string" && input === OLD_RPC) {
          console.warn("[iframe RPC redirect][fetch]", input, "→", NEW_RPC);
          input = NEW_RPC;
        } else if (input instanceof Request && input.url === OLD_RPC) {
          console.warn("[iframe RPC redirect][fetch]", input.url, "→", NEW_RPC);
          input = new Request(NEW_RPC, input);
        }
        return originalFetch.call(this, input, init);
      };
    }
  })();

    const scriptParameters = ${JSON.stringify(scriptParameters)}
    let resolveScript
    let rejectScript
    const returnPromise = new Promise((resolve, reject) => {
      resolveScript = resolve
      rejectScript = reject
    })

    returnPromise.then(result => {window.parent.postMessage(
      {
        target: ${JSON.stringify(messageTarget)},
        result
      },
      '*'
    )})

    ${scriptString}
    getMetaEvidence()
  </script>`;

  const _ = iframe({
    body: frameBody,
    sandboxAttributes: [
      "allow-scripts",
      arbitrableWhitelist[scriptParameters.arbitrableChainID]?.includes(
        scriptParameters.arbitrableContractAddress.toLowerCase()
      )
        ? "allow-same-origin"
        : undefined,
    ],
  });
  _.iframe.style.display = "none";
  return returnPromise;
};

const funcs = {
  async getMetaEvidence(chainID, arbitrated, arbitrator, disputeId, ruled) {
    const cached = readCachedMetaEvidence(chainID, arbitrator, disputeId);
    if (cached) return cached;

    const startTime = Date.now();
    const maxTime = 120000;
    const waitTime = 5000;
    while (Date.now() - startTime < maxTime) {
      try {
        const metaEvidenceUriData = await axios.get(
          `${process.env.REACT_APP_METAEVIDENCE_URL}?chainId=${chainID}&disputeId=${disputeId}`
        );

        const uri = metaEvidenceUriData.data?.metaEvidenceUri;
        if (!uri) throw new Error(`No MetaEvidence log for disputeId ${disputeId} on chainID ${chainID}`);
        if (!isContentAddressed(uri)) break;

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
          if (!isContentAddressed(metaEvidenceJSON.dynamicScriptURI)) break;

          const scriptURI =
            chainID === 1 && disputeId === "1621"
              ? getHttpUri("/ipfs/Qmf1k727vP7qZv21MDB8vwL6tfVEKPCUQAiw8CTfHStkjf")
              : getHttpUri(metaEvidenceJSON.dynamicScriptURI);

          console.info("Fetching dynamic script file at", scriptURI);

          const fileResponse = await axios.get(scriptURI);

          if (fileResponse.status !== 200) throw new Error(`Unable to fetch dynamic script file at ${scriptURI}.`);

          const injectedParameters = {
            arbitratorChainID: metaEvidenceJSON.arbitratorChainID || chainID,
            arbitrableChainID: metaEvidenceJSON.arbitrableChainID || chainID,
            disputeID: disputeId,
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

        //Ruled disputes are final, their metaEvidence can never change and is safe to cache.
        if (ruled) writeCachedMetaEvidence(chainID, arbitrator, disputeId, metaEvidenceJSON);

        return metaEvidenceJSON;
      } catch (err) {
        await new Promise((r) => setTimeout(() => r(), waitTime));
        console.warn("Failed to get the evidence:", err);
      }
    }
    return {
      description:
        "In case you have an AdBlock enabled, please disable it and refresh the page. It may be preventing the correct working of the page. If that's not the case, the data for this case is not formatted correctly or has been tampered since the time of its submission. Please refresh the page and refuse to arbitrate if the problem persists.",
      title: "Invalid or tampered case data, refuse to arbitrate.",
      rulingOptions: { type: "single-select", titles: [] },
    };
  },
  async loadPolicy(URI) {
    if (!URI) {
      console.error("No URI provided");
      return;
    }
    const policyURL = toHttpUrl(URI);

    try {
      if (!isContentAddressed(URI)) throw new Error(`Policy URI is not content-addressed: ${URI}`);

      const res = await axios.get(policyURL);

      if (res.status !== 200)
        throw new Error(`HTTP Error: Unable to fetch file at ${policyURL}. Returned status code ${res.status}`);

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
  //Batching is disabled because the loaders gain nothing from it (each key is fetched independently)
  //A single hanging dynamic script would keep all the other cards of a cases list stuck on their skeletons.
  acc[f] = new Dataloader((argsArr) => Promise.all(argsArr.map((args) => funcs[f](...args))), {
    batch: false,
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

const normalizeEvidenceJSON = (json) => {
  if (!json || typeof json !== "object" || Array.isArray(json)) return json;
  const normalized = { ...json };

  //Many PoH cases have an evidence format mismatch.
  //It uses the `evidence` field for the attached file URI instead of the `fileURI` field directly.
  if (!normalized.fileURI && normalized.evidence) {
    normalized.fileURI = normalized.evidence;
  }
  return normalized;
};

const evidenceFetcher = async ([subgraph, disputeId]) => {
  const evidence = await axios
    .post(
      subgraph,
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

  return (
    await Promise.all(
      evidence.map(async (evidenceItem) => {
        try {
          if (!isContentAddressed(evidenceItem.URI))
            throw new Error(`Evidence URI is not content-addressed: ${evidenceItem.URI}`);

          const uri = getHttpUri(evidenceItem.URI);
          try {
            const fileRes = await axios.get(uri);
            if (fileRes.status !== 200)
              throw new Error(`HTTP Error: Unable to fetch file at ${uri}. Returned status code ${fileRes.status}`);

            const evidenceJSON = normalizeEvidenceJSON(fileRes.data);
            return {
              evidenceJSON,
              submittedAt: evidenceItem.creationTime,
              submittedBy: evidenceItem.sender,
            };
          } catch (requestError) {
            // URI is correct, but the request failed
            return {
              error: `${requestError.message}. Requested URI: ${uri}`,
              submittedAt: evidenceItem.creationTime,
              submittedBy: evidenceItem.sender,
            };
          }
        } catch (uriError) {
          // invalid uri, returning null to be filtered out
          console.error(uriError.message);
          return null;
        }
      })
    )
  ).filter((e) => !!e); // This will filter out the null values (invalid URIs)
};

export function useEvidence(chainId, disputeID) {
  const { data } = useSWR(chainId && disputeID ? [displaySubgraph[chainId], disputeID] : null, evidenceFetcher, {
    revalidateOnReconnect: false,
  });

  return data;
}

export const VIEW_ONLY_ADDRESS = "0x0000000000000000000000000000000000000000";
