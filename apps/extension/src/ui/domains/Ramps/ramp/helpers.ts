import { RAMPS_RAMP_API_URL } from "extension-shared"

export const getRampBuyUrl = async (
  currencyCode: string,
  amount: number,
  cryptoAssetSymbol: string,
  address: string,
  countryCode: string,
) => {
  // https://docs.ramp.network/configuration
  const params = new URLSearchParams({
    defaultFlow: "ONRAMP",
    hideExitButton: "true",

    selectedCountryCode: countryCode,
    swapAsset: cryptoAssetSymbol,
    userAddress: address,
    fiatCurrency: currencyCode,
    fiatValue: amount.toString(),
  })

  const response = await fetch(
    `${RAMPS_RAMP_API_URL}/talisman/getSignedBuySellUrl?${params.toString()}`,
  )
  if (!response.ok) throw new Error(`Failed to generate Ramp URL`)

  const url = (await response.json())?.url
  if (!url) throw new Error(`Failed to generate Ramp URL`)

  return url
}

export const getRampSellUrl = async (
  cryptoAssetSymbol: string,
  plancks: string | bigint,
  address: string,
  currencyCode: string,
  countryCode: string,
) => {
  const params = new URLSearchParams({
    defaultFlow: "OFFRAMP",
    hideExitButton: "true",

    selectedCountryCode: countryCode,
    swapAsset: cryptoAssetSymbol,
    userAddress: address,
    fiatCurrency: currencyCode,
    swapAmount: plancks.toString(),
  })

  const response = await fetch(
    `${RAMPS_RAMP_API_URL}/talisman/getSignedBuySellUrl?${params.toString()}`,
  )
  if (!response.ok) throw new Error(`Failed to generate Ramp URL`)

  const url = (await response.json())?.url
  if (!url) throw new Error(`Failed to generate Ramp URL`)

  return url
}
