import { RAMPS_COINBASE_API_BASE_PATH, RAMPS_COINBASE_PAY_URL } from "extension-shared"
import urlJoin from "url-join"

import { remoteConfig$ } from "@ui/state"

export const getCoinbaseBuyUrl = async (
  currencyCode: string,
  amountIn: string,
  assetId: string,
  assetSymbol: string,
  network: string,
  quoteId: string,
  address: string,
) => {
  const remoteConfig = await remoteConfig$.getValue()
  const sessionToken = await getCoinbaseSessionToken(assetId, assetSymbol, network, address)

  // docs: https://docs.cdp.coinbase.com/onramp/docs/api-oneclickbuy
  const query = new URLSearchParams({
    appId: remoteConfig.ramps.coinbaseProjectId,
    destinationWallets: JSON.stringify([{ address, blockchains: [network] }]),
    sessionToken,
    defaultAsset: assetId,
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
  assetSymbol: string,
  network: string,
  quoteId: string,
  address: string,
) => {
  const remoteConfig = await remoteConfig$.getValue()
  const sessionToken = await getCoinbaseSessionToken(assetId, assetSymbol, network, address)

  // docs: https://docs.cdp.coinbase.com/onramp/docs/api-offramp-initializing
  const query = new URLSearchParams({
    appId: remoteConfig.ramps.coinbaseProjectId,
    addresses: JSON.stringify({ [address]: [network] }),
    sessionToken,
    assets: JSON.stringify([assetId]),
    partnerUserId: "talisman",
    presetCryptoAmount: amountIn,
    fiatCurrency: currencyCode,
    quoteId,
    redirectUrl: chrome.runtime.getURL("dashboard.html"),
  })

  return urlJoin(RAMPS_COINBASE_PAY_URL, `/v3/sell/input?${query}`)
}

const getCoinbaseSessionToken = async (
  _assetId: string,
  assetSymbol: string,
  network: string,
  address: string,
) => {
  const url = urlJoin(RAMPS_COINBASE_API_BASE_PATH, "/token")
  const method = "POST"
  const headers = { "Content-Type": "application/json" }
  const body = JSON.stringify({
    addresses: [{ address, blockchains: [network] }],
    // NOTE: Ideally we would use assetId instead of assetSymbol,
    // but when we use the generated sessionToken it seems to raise an "asset <asset-id> not found" error on the Coinbase API.
    assets: [assetSymbol],
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
