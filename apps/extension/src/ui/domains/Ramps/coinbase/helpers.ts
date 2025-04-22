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
    defaultPaymentMethod: "CARD",
    presetFiatAmount: amountIn.toString(),
    fiatCurrency: currencyCode,
    defaultNetwork: network,
    presetCryptoAmount: amountOut.toString(),
    quoteId,
    destinationWallets: JSON.stringify([{ address, blockchains: [network] }]),
  })

  return urlJoin(COINBASE_PAY_URL, `/buy/select-asset?${query}`)
}
