import archon from "../bootstrap/archon";
import { getReadOnlyRpcUrl } from "../bootstrap/web3";

export const getMetaEvidence = async (arbitratorChainID, contractAddress, arbitratorAddress, disputeID, options) => {
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
};
