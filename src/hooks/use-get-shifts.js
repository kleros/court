import { useEffect, useState } from "react";

const fetchShifts = async (chainId, where, lastId, first) => {
  const subgraphEndpoints = {
    1: "https://api.thegraph.com/subgraphs/name/greenlucid/kleros-display-mainnet",
    100: "https://api.thegraph.com/subgraphs/name/greenlucid/kleros-display",
  };

  const subgraphQuery = {
    query: `
    {
      tokenAndETHShifts(where: {${where}, id_gt: "${lastId}"}, first: ${first}) {
        id
        ETHAmount
        address
        disputeID
        tokenAmount
      }
    }
    `,
  };

  const response = await fetch(subgraphEndpoints[chainId], {
    method: "POST",
    body: JSON.stringify(subgraphQuery),
  });

  const { data } = await response.json();
  return data.tokenAndETHShifts;
};

const getBatch = async (chainId, where) => {
  const batches = [];
  let lastId = "";
  const BATCH_SIZE = 1000;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const entities = await fetchShifts(chainId, where, lastId, BATCH_SIZE);
    batches.push(entities);
    if (entities.length < BATCH_SIZE) break;
    lastId = entities[BATCH_SIZE - 1].id;
  }
  return batches.flat(1);
};

const useGetShifts = (chainId, where) => {
  const [shifts, setShifts] = useState();

  useEffect(() => {
    getBatch(chainId, where).then((s) => setShifts(s));
  }, [chainId, where]);

  return shifts;
};

export default useGetShifts;
