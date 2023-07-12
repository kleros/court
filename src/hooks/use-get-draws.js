import { useEffect, useState } from "react";

const fetchDraws = async (chainId, where, lastId) => {
  const subgraphEndpoints = {
    1: "https://api.thegraph.com/subgraphs/name/greenlucid/kleros-display-mainnet",
    100: "https://api.thegraph.com/subgraphs/name/greenlucid/kleros-display",
  };

  const subgraphQuery = {
    query: `
    {
      draws(where: {${where}, id_gt: "${lastId}"}, first: 1000) {
        address
        disputeID
        appeal
        voteID
      }
    }
    `,
  };

  const response = await fetch(subgraphEndpoints[chainId], {
    method: "POST",
    body: JSON.stringify(subgraphQuery),
  });

  const { data } = await response.json();
  return data.draws;
};

const getBatch = async (chainId, where) => {
  const batches = [];
  let lastId = "";
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const entities = await fetchDraws(chainId, where, lastId);
    batches.push(entities);
    if (entities.length < 1000) break;
    lastId = entities[999];
  }
  return batches.flat(1);
};

const useGetDraws = (chainId, where) => {
  const [draws, setDraws] = useState();

  useEffect(() => {
    getBatch(chainId, where).then((d) => setDraws(d));
  }, [chainId, where]);

  return draws;
};

export default useGetDraws;
