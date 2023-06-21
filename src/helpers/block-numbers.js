const KlerosLiquidBlockNumbers = {
  1: process.env.REACT_APP_KLEROS_LIQUID_BLOCK_NUMBER,
  5: process.env.REACT_APP_KLEROS_LIQUID_GOERLI_BLOCK_NUMBER,
  100: process.env.REACT_APP_KLEROS_LIQUID_XDAI_BLOCK_NUMBER,
  10200: process.env.REACT_APP_KLEROS_LIQUID_CHIADO_BLOCK_NUMBER,
  11155111: process.env.REACT_APP_KLEROS_LIQUID_SEPOLIA_BLOCK_NUMBER,
};

export const getKlerosLiquidBlockNumber = (chainId) => KlerosLiquidBlockNumbers[chainId];
