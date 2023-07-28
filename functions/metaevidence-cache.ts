// Import supabase and fetch
const { createClient } = require("@supabase/supabase-js")
// const fetch = require("node-fetch")

// Create a client
const supabaseUrl = process.env.DATALAKE_URL
const supabaseKey = process.env.DATALAKE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

exports.handler = async function(event, context) {
    // Get parameters from the query string
    let { chainId, disputeId } = event.queryStringParameters

    // Check if the query string parameters are valid
    chainId = parseInt(chainId)
    disputeId = parseInt(disputeId)
    
    if (isNaN(chainId) || isNaN(disputeId)) {
        return {
            statusCode: 400,
            body: JSON.stringify({ msg: "Invalid parameters. chainId and disputeId should be integers." }),
        }
    }

    // Check if chainId is 1, 100, or 11155111
    if (![1, 100, 11155111].includes(chainId)) {
        return {
            statusCode: 400,
            body: JSON.stringify({ msg: "Invalid chainId. It should be 1, 100, or 11155111." }),
        }
    }

    // Query Supabase
    let { data, error } = await supabase
        .from('court-v1-metaevidence')
        .select('response')
        .eq('chainId', chainId)
        .eq('disputeId', disputeId)

    // Handle errors
    if (error) {
        console.log('Error: ', error)
        return {
            statusCode: 500,
            body: JSON.stringify({ msg: error.message }),
        }
    }

    // If there is no response yet, invoke a background function
    if (!data || !data.length) {
        const bgFunctionPayload = JSON.stringify({ chainId, disputeId })
        // Define your background function URL
        const bgFunctionURL = "https://court.kleros.io/.netlify/functions/metaevidence-background"
        const response = await fetch(bgFunctionURL, {
            method: 'POST',
            body: bgFunctionPayload,
            headers: { 'Content-Type': 'application/json' },
        })

        if (!response.ok) {
            console.error('Failed to invoke background function: ', await response.text())
        }
    }

    // Return the response
    return {
        statusCode: 200,
        body: JSON.stringify(data),
    }
}
