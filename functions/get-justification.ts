import { Handler } from '@netlify/functions';
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.DATALAKE_URL;
const supabaseKey = process.env.DATALAKE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const allowedNetworks = ['gnosischain', 'ethereum', 'chiado'];

export const handler: Handler = async (event) => {
  const disputeID = parseInt(event.queryStringParameters.disputeID);
  const appeal = parseInt(event.queryStringParameters.appeal);
  const network = event.queryStringParameters.network;

  if (!allowedNetworks.includes(network) || isNaN(disputeID) || isNaN(appeal) || event.httpMethod !== "GET") {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Invalid inputs. Network must be gnosischain, ethereum or chiado, and both disputeID and appeal must be valid numbers.' }),
    };
  }

  const { data, error } = await supabase
    .from(`${network}-justifications`)
    .select('*')
    .eq('disputeIDAndAppeal', `${disputeID}-${appeal}`);

  if (error) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      payload: {
        justifications: data,
      },
    }),
  };
};