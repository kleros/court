import { MAINNET, GOERLI, GNOSIS, CHIADO, SEPOLIA } from "./networks";
import mainnet from "../assets/deployments/mainnet.json";
import gnosis from "../assets/deployments/gnosis.json";
import goerli from "../assets/deployments/goerli.json";
import sepolia from "../assets/deployments/sepolia.json";
import chiado from "../assets/deployments/chiado.json";

const DUMMY_ADDRESS = "0x00000000219ab540356cbb839cbe05303d7705fa"; // Dummy address for coping with Drizzle errors.

export const KlerosLiquidBlockNumbers = {
  1: mainnet.klerosLiquidBlockNumber,
  5: goerli.klerosLiquidBlockNumber,
  100: gnosis.klerosLiquidBlockNumber,
  10200: chiado.klerosLiquidBlockNumber,
  11155111: sepolia.klerosLiquidBlockNumber,
};

export const oldKlerosAddresses = {
  [MAINNET]: { address: mainnet.klerosAddress },
  [GOERLI]: { address: DUMMY_ADDRESS },
  [GNOSIS]: { address: gnosis.klerosAddress },
  [CHIADO]: { address: DUMMY_ADDRESS },
  [SEPOLIA]: { address: DUMMY_ADDRESS },
};

export const klerosLiquidAddresses = {
  [MAINNET]: { address: mainnet.klerosAddress },
  [GOERLI]: { address: DUMMY_ADDRESS },
  [GNOSIS]: { address: gnosis.klerosAddress },
  [CHIADO]: { address: DUMMY_ADDRESS },
  [SEPOLIA]: { address: DUMMY_ADDRESS },
};

export const klerosLiquidExtraViewsAddresses = {
  [MAINNET]: { address: mainnet.klerosLiquidExtraViewsAddress },
  [GOERLI]: { address: goerli.klerosLiquidExtraViewsAddress },
  [GNOSIS]: { address: gnosis.klerosLiquidExtraViewsAddress },
  [CHIADO]: { address: chiado.klerosLiquidExtraViewsAddress },
  [SEPOLIA]: { address: sepolia.klerosLiquidExtraViewsAddress },
};

export const pinakionAddresses = {
  [MAINNET]: { address: mainnet.pinakionAddress },
  [GOERLI]: { address: goerli.pinakionAddress },
  [GNOSIS]: { address: gnosis.pinakionAddress },
  [CHIADO]: { address: chiado.pinakionAddress },
  [SEPOLIA]: { address: sepolia.pinakionAddress },
};

export const policyRegistryAddresses = {
  [MAINNET]: { address: mainnet.policyRegistryAddress },
  [GOERLI]: { address: goerli.policyRegistryAddress },
  [GNOSIS]: { address: gnosis.policyRegistryAddress },
  [CHIADO]: { address: chiado.policyRegistryAddress },
  [SEPOLIA]: { address: sepolia.policyRegistryAddress },
};

export const uniswapV2FactoryAddresses = {
  [MAINNET]: { address: mainnet.uniswapV2FactoryAddress },
  [GOERLI]: { address: DUMMY_ADDRESS },
  [GNOSIS]: { address: gnosis.uniswapV2FactoryAddress },
  [CHIADO]: { address: DUMMY_ADDRESS },
  [SEPOLIA]: { address: DUMMY_ADDRESS },
};

export const uniswapV2Router02Addresses = {
  [MAINNET]: { address: mainnet.uniswapV2Router02Address },
  [GOERLI]: { address: DUMMY_ADDRESS },
  [GNOSIS]: { address: gnosis.uniswapV2Router02Address },
  [CHIADO]: { address: DUMMY_ADDRESS },
  [SEPOLIA]: { address: DUMMY_ADDRESS },
};

export const getKlerosLiquidBlockNumber = (chainId) => KlerosLiquidBlockNumbers[chainId];
export const getOldKlerosAddress = (chainId) => oldKlerosAddresses[chainId].address;
export const getKlerosLiquidAddress = (chainId) => klerosLiquidAddresses[chainId].address;
export const getKlerosLiquidExtraViewsAddress = (chainId) => klerosLiquidExtraViewsAddresses[chainId].address;
export const getPinakionAddress = (chainId) => pinakionAddresses[chainId].address;
export const getPolicyRegistryAddress = (chainId) => policyRegistryAddresses[chainId].address;
export const getUniswapV2FactoryAddress = (chainId) => uniswapV2FactoryAddresses[chainId].address;
export const getUniswapV2Router02Address = (chainId) => uniswapV2Router02Addresses[chainId].address;
