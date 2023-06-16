import { Handler } from '@netlify/functions';
import { Client } from '@supabase/supabase-js';


const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_KEY;
const supabase = new Client(supabaseUrl, supabaseAnonKey);
const allowedNetworks = ['gnosischain', 'ethereum', 'chiado'];

export const handler: Handler = async (event) => {
  const payload = JSON.parse(event.body).payload;
  const disputeID = parseInt(payload.disputeID);
  const appeal = parseInt(payload.appeal);

  if (!allowedNetworks.includes(payload.network) || !Number.isInteger(disputeID) || !Number.isInteger(appeal)) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Invalid inputs. Network must be gnosischain, and both disputeID and appeal must be integers.' }),
    };
  }

  const { data, error } = await supabase
    .from(`${payload.network}-justifications`)
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
        justifications: data
      }
    })
  };
};
