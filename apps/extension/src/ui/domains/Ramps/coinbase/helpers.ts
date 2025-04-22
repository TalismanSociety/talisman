import urlJoin from "url-join"

const COINBASE_PROJECT_ID = "63080e24-dc8e-45d0-9618-467b8c222f9e"
const COINBASE_PAY_URL = "https://pay.coinbase.com"

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
