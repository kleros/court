import { Contract, ethers } from "ethers";
import PropTypes from "prop-types";
import KLEROS_LIQUID_ABI from "../assets/contracts/kleros-liquid.json";
import POLICY_REGISTRY_ABI from "../assets/contracts/policy-registry.json";

useContract.propTypes = {
  chainID: PropTypes.number.isRequired,
};

const chainIdToRpcEndpoint = {
  1: process.env.REACT_APP_WEB3_FALLBACK_HTTPS_URL,
  5: process.env.REACT_APP_WEB3_FALLBACK_GOERLI_HTTPS_URL,
  100: process.env.REACT_APP_WEB3_FALLBACK_XDAI_HTTPS_URL,
};

const chainIdToLiquidContractAddress = {
  1: process.env.REACT_APP_KLEROS_LIQUID_ADDRESS,
  5: process.env.REACT_APP_KLEROS_LIQUID_GOERLI_ADDRESS,
  100: process.env.REACT_APP_KLEROS_LIQUID_XDAI_ADDRESS,
};
const chainIdToPolicyContractAddress = {
  1: process.env.REACT_APP_POLICY_REGISTRY_ADDRESS,
  5: process.env.REACT_APP_POLICY_REGISTRY_GOERLI_ADDRESS,
  100: process.env.REACT_APP_POLICY_REGISTRY_XDAI_ADDRESS,
};

export default function useContract({ chainID }) {
  const url = chainIdToRpcEndpoint[chainID];
  console.log("🚀 ~ file: use-contract.js:25 ~ useContract ~ url:", url);
  const klerosLiquidContractAddress = chainIdToLiquidContractAddress[chainID];
  const policyRegistryContractAddress = chainIdToPolicyContractAddress[chainID];
  const provider = new ethers.providers.JsonRpcProvider(url);

  const klerosLiquid = new Contract(klerosLiquidContractAddress, KLEROS_LIQUID_ABI.abi, provider);
  const policyRegistry = new Contract(policyRegistryContractAddress, POLICY_REGISTRY_ABI.abi, provider);
  if (!url) {
    throw new Error(`Unsupported chain ID: ${chainID}`);
  }

  return { klerosLiquid, policyRegistry };
}
