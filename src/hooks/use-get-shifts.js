import axios from "axios";
import { useEffect, useState } from "react";
import { displaySubgraph } from "../bootstrap/subgraph";

const fetchShifts = async (chainId, where, lastId, first) => {
  const res = await axios.post(displaySubgraph[chainId], {
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
  });

  return res.data.data.tokenAndETHShifts;
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
