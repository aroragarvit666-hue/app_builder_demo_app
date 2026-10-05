/*
* <license header>
*/

const fetch = require('node-fetch')
const { generateAccessToken } = require('@adobe/aio-lib-core-auth')
const sdk = require('@adobe/aio-lib-analytics')

/**
 * Builds an initialized Analytics 2.0 client.
 *
 * Flow: get an IMS S2S token (creds injected by include-ims-credentials) ->
 * discover the globalCompanyId for the org -> init the aio-lib-analytics client.
 *
 * @param {object} params action input parameters
 * @returns {Promise<{client: object, globalCompanyId: string}>}
 */
async function initAnalytics (params) {
  const tokenResponse = await generateAccessToken(params)
  const accessToken = typeof tokenResponse === 'string' ? tokenResponse : tokenResponse.access_token
  const apiKey = params.apiKey

  const res = await fetch('https://analytics.adobe.io/discovery/me', {
    headers: { Authorization: `Bearer ${accessToken}`, 'x-api-key': apiKey }
  })
  if (!res.ok) {
    throw new Error(`discovery/me failed with status ${res.status}`)
  }
  const { imsOrgs } = await res.json()
  const globalCompanyId = imsOrgs[0].companies[0].globalCompanyId

  const client = await sdk.init(globalCompanyId, apiKey, accessToken)
  return { client, globalCompanyId }
}

module.exports = { initAnalytics }
