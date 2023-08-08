import axios from "axios";
import { useEffect, useState } from "react";
import { displaySubgraph } from "../bootstrap/subgraph";

const fetchDraws = async (chainId, where, lastId, first) => {
  const res = await axios.post(displaySubgraph[chainId], {
    query: `
  {
    draws(where: {${where}, id_gt: "${lastId}"}, first: ${first}) {
      id
      address
      disputeID
      appeal
      voteID
    }
  }
  `,
  });

  return res.data.data.draws;
};

const getBatch = async (chainId, where) => {
  const batches = [];
  let lastId = "";
  const BATCH_SIZE = 1000;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const entities = await fetchDraws(chainId, where, lastId, BATCH_SIZE);
    batches.push(entities);
    if (entities.length < BATCH_SIZE) break;
    lastId = entities[BATCH_SIZE - 1].id;
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
