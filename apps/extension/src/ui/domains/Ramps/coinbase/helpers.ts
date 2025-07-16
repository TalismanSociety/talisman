import { RAMPS_COINBASE_API_BASE_PATH, RAMPS_COINBASE_PAY_URL } from "extension-shared"
import urlJoin from "url-join"

export const getCoinbaseBuyUrl = async (
  currencyCode: string,
  amountIn: string,
  _assetId: string,
  assetSymbol: string,
  network: string,
  quoteId: string,
  address: string,
) => {
  // NOTE: Ideally we would use assetId instead of assetSymbol,
  // but when we use the generated sessionToken it seems to raise an "<asset-id> is not available" error on the Coinbase buy widget.
  const sessionToken = await getCoinbaseSessionToken(/* assetId */ assetSymbol, network, address)

  // docs: https://docs.cdp.coinbase.com/onramp/docs/api-oneclickbuy
  const query = new URLSearchParams({
    // appId: remoteConfig.ramps.coinbaseProjectId, // deprecated, replaced by sessionToken
    // addresses: JSON.stringify({ [address]: [network] }), // deprecated, replaced by sessionToken
    // assets: JSON.stringify([/* assetId */ assetSymbol]), // deprecated, replaced by sessionToken
    sessionToken,
    defaultAsset: /* assetId */ assetSymbol,
    defaultNetwork: network,
    defaultExperience: "buy",
    partnerUserId: "talisman",
    presetFiatAmount: amountIn,
    fiatCurrency: currencyCode,
    quoteId,
    redirectUrl: chrome.runtime.getURL("dashboard.html"),
  })

  return urlJoin(RAMPS_COINBASE_PAY_URL, `/buy/select-asset?${query}`)
}

export const getCoinbaseSellUrl = async (
  currencyCode: string,
  amountIn: string,
  assetId: string,
  _assetSymbol: string,
  network: string,
  quoteId: string,
  address: string,
) => {
  const sessionToken = await getCoinbaseSessionToken(assetId, network, address)

  // docs: https://docs.cdp.coinbase.com/onramp/docs/api-offramp-initializing
  const query = new URLSearchParams({
    // appId: remoteConfig.ramps.coinbaseProjectId, // deprecated, replaced by sessionToken
    // addresses: JSON.stringify({ [address]: [network] }), // deprecated, replaced by sessionToken
    // assets: JSON.stringify([assetId]), // deprecated, replaced by sessionToken
    sessionToken,
    defaultAsset: assetId,
    defaultNetwork: network,
    partnerUserId: "talisman",
    presetCryptoAmount: amountIn,
    fiatCurrency: currencyCode,
    quoteId,
    redirectUrl: chrome.runtime.getURL("dashboard.html"),
  })

  return urlJoin(RAMPS_COINBASE_PAY_URL, `/v3/sell/input?${query}`)
}

const getCoinbaseSessionToken = async (assetId: string, network: string, address: string) => {
  const url = urlJoin(RAMPS_COINBASE_API_BASE_PATH, "/token")
  const method = "POST"
  const headers = { "Content-Type": "application/json" }
  const body = JSON.stringify({
    addresses: [{ address, blockchains: [network] }],
    assets: [assetId],
  })

  try {
    const response = await fetch(url, { method, headers, body })
    const json = await response.json()
    const sessionToken = json?.token
    if (!sessionToken) throw new Error("Coinbase API returned an invalid session token")
    return sessionToken
  } catch (cause) {
    throw new Error(`Failed to get coinbase sessionToken: ${String(cause)}`, { cause })
  }
}
