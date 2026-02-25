export const displaySubgraph = {
  1: process.env.REACT_APP_SUBGRAPH_MAINNET_DISPLAY,
  100: process.env.REACT_APP_SUBGRAPH_GNOSIS_DISPLAY,
  10200: process.env.REACT_APP_SUBGRAPH_CHIADO_DISPLAY,
  11155111: process.env.REACT_APP_SUBGRAPH_SEPOLIA_DISPLAY,
};

export const klerosboardSubgraph = {
  1: "https://api.studio.thegraph.com/query/66145/klerosboard-mainnet/version/latest",
  100: "https://api.studio.thegraph.com/query/66145/klerosboard-gnosis/version/latest",
};
