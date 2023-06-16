import { Handler } from '@netlify/functions';
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.COURT_DB_URL;
const supabaseKey = process.env.COURT_DB_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const allowedNetworks = ['gnosischain', 'ethereum', 'chiado'];

export const handler: Handler = async (event) => {
  const payload = JSON.parse(event.body).payload;
  const disputeID = parseInt(payload.disputeID);
  const appeal = parseInt(payload.appeal);


  if (!allowedNetworks.includes(payload.network) || isNaN(disputeID) || isNaN(appeal) || event.httpMethod !== "GET") {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Invalid inputs. Network must be gnosischain, ethereum or chiado, and both disputeID and appeal must be valid numbers.' }),
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
