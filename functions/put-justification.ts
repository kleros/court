import { Handler } from '@netlify/functions';
import { Client } from '@supabase/supabase-js';
import Web3 from 'web3';
import { Logtail } from '@logtail/node';
const { KlerosLiquid } = require(`../src/assets/contracts/kleros-liquid.json`);

const logtail = new Logtail(process.env.LOGTAIL_SOURCE_TOKEN);

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_KEY;
const supabase = new Client(supabaseUrl, supabaseAnonKey);

const networks = {
  'gnosischain': {
    infuraUrl: process.env.GNOSIS_RPC,
    klerosAddress: process.env.GNOSIS_LIQUID
  },
  'ethereum': {
    infuraUrl: process.env.ETHEREUM_RPC,
    klerosAddress: process.env.ETHEREUM_LIQUID
  },
  'sepolia': {
    infuraUrl: process.env.SEPOLIA_RPC,
    klerosAddress: process.env.SEPOLIA_LIQUID
  }
};

export const handler: Handler = async (event) => {
  try {
    const payload = JSON.parse(event.body).payload;
    const network = networks[payload.network];

    if (!network) {
      throw new Error(`No Kleros Liquid address found for network ${payload.network}`);
    }

    const web3 = new Web3(new Web3.providers.HttpProvider(network.infuraUrl));
    const klerosLiquid = new web3.eth.Contract(KlerosLiquid.abi, network.klerosAddress);

    for (const voteID of payload.justification.voteIDs) {
      const vote = await klerosLiquid.methods
        .getVote(
          payload.justification.disputeID,
          payload.justification.appeal,
          voteID
        )
        .call();

      if (vote.account !== payload.address || vote.voted) {
        throw new Error('Not all of the supplied vote IDs belong to the supplied address and are not cast.');
      }
    }

    const { error } = await supabase.from(`${payload.network}-justifications`).insert([
      {
        disputeIDAndAppeal: `${payload.justification.disputeID}-${payload.justification.appeal}`,
        voteID: String(payload.justification.voteIDs[payload.justification.voteIDs.length - 1]),
        justification: payload.justification.justification,
      },
    ]);

    if (error) {
      throw new Error(error.message);
    }

    logtail.info("Justification made", { disputeID: payload.justification.disputeID, appeal: payload.justification.appeal });

    await logtail.flush();

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        payload: {
          votes: payload.justification
        }
      })
    };

  } catch (err) {
    logtail.error("Error occurred", { error: err.message });
    await logtail.flush();

    console.error(err);
    return {
      statusCode: 403,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: err.message
      })
    };
  }
};

