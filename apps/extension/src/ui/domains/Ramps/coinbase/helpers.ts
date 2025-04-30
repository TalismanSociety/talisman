import { RAMPS_COINBASE_PAY_URL } from "extension-shared"
import urlJoin from "url-join"

import { remoteConfig$ } from "@ui/state"

export const getCoinbaseBuyUrl = async (
  currencyCode: string,
  amountIn: string,
  assetId: string,
  network: string,
  quoteId: string,
  address: string,
) => {
  const remoteConfig = await remoteConfig$.getValue()

  // docs: https://docs.cdp.coinbase.com/onramp/docs/api-oneclickbuy
  const query = new URLSearchParams({
    appId: remoteConfig.ramps.coinbaseProjectId,
    defaultAsset: assetId,
    presetFiatAmount: amountIn,
    fiatCurrency: currencyCode,
    quoteId,
    destinationWallets: JSON.stringify([{ address, blockchains: [network] }]),
    redirectUrl: chrome.runtime.getURL("dashboard.html"),
  })

  return urlJoin(RAMPS_COINBASE_PAY_URL, `/buy/select-asset?${query}`)
}

export const getCoinbaseSellUrl = async (
  currencyCode: string,
  amountIn: string,
  assetId: string,
  network: string,
  quoteId: string,
  address: string,
) => {
  const remoteConfig = await remoteConfig$.getValue()

  // docs: https://docs.cdp.coinbase.com/onramp/docs/api-offramp-initializing
  const query = new URLSearchParams({
    appId: remoteConfig.ramps.coinbaseProjectId,
    addresses: JSON.stringify({ [address]: [network] }),
    assets: JSON.stringify([assetId]),
    partnerUserId: "talisman",
    presetCryptoAmount: amountIn,
    fiatCurrency: currencyCode,
    quoteId,
    redirectUrl: chrome.runtime.getURL("dashboard.html"),
  })

  return urlJoin(RAMPS_COINBASE_PAY_URL, `/v3/sell/input?${query}`)
}
