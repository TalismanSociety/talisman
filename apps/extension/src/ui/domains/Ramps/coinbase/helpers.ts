import { COINBASE_PAY_URL, COINBASE_PROJECT_ID } from "extension-shared"
import urlJoin from "url-join"

// TODO check if it works
export const getCoinbaseBuyUrl = (
  currencyCode: string,
  amountIn: string,
  assetId: string,
  network: string,
  quoteId: string,
  amountOut: string,
  address: string,
) => {
  const query = new URLSearchParams({
    appId: COINBASE_PROJECT_ID,
    defaultAsset: assetId,
    // defaultPaymentMethod: "CARD",
    presetFiatAmount: amountIn,
    fiatCurrency: currencyCode,
    // defaultNetwork: network,
    presetCryptoAmount: amountOut.toString(),
    quoteId,
    destinationWallets: JSON.stringify([{ address, blockchains: [network] }]),
  })

  return urlJoin(COINBASE_PAY_URL, `/buy/select-asset?${query}`)
}

// TODO check if it works
export const getCoinbaseSellUrl = (
  currencyCode: string,
  amountIn: string,
  assetId: string,
  network: string,
  quoteId: string,
  amountOut: string,
  address: string,
) => {
  // TODO apparently

  const query = new URLSearchParams({
    appId: COINBASE_PROJECT_ID,
    addresses: JSON.stringify({ [address]: [network] }),
    assets: JSON.stringify([assetId]), // expects symbol instead?
    partnerUserId: "talisman", // TODO check if field is required

    presetCryptoAmount: amountIn,
    presetFiatAmount: amountOut,
    fiatCurrency: currencyCode,

    // defaultAsset: assetId,
    // defaultPaymentMethod: "CARD",
    // presetFiatAmount: amountIn.toString(),

    // defaultNetwork: network,
    // presetCryptoAmount: amountOut.toString(),
    quoteId,
    // destinationWallets: JSON.stringify([{ address, blockchains: [network] }]),
  })

  return urlJoin(COINBASE_PAY_URL, `/sell/input?${query}`)
}
