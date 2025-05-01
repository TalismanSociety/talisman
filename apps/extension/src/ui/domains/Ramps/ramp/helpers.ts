import { RAMPS_RAMP_PAY_URL } from "extension-shared"

import { remoteConfig$ } from "@ui/state"

const TALISMAN_LOGO_URL =
  "https://raw.githubusercontent.com/TalismanSociety/talisman-web/0fa6f5a99b4729f740c1a68bbe3d2ca9c85c9daa/apps/portal/public/talisman.svg"

export const getRampBuyUrl = async (
  currencyCode: string,
  amount: number,
  cryptoAssetSymbol: string,
  address: string,
  countryCode: string,
) => {
  const remoteConfig = await remoteConfig$.getValue()

  // https://docs.ramp.network/configuration
  const params = new URLSearchParams({
    hostApiKey: remoteConfig.ramps.rampApiKey,
    hostLogoUrl: TALISMAN_LOGO_URL,
    defaultFlow: "ONRAMP",
    enabledFlows: "ONRAMP,OFFRAMP",
    hostAppName: "Talisman",
    hideExitButton: "true",

    selectedCountryCode: countryCode,
    swapAsset: cryptoAssetSymbol,
    userAddress: address,
    fiatCurrency: currencyCode,
    fiatValue: amount.toString(),
  })

  return `${RAMPS_RAMP_PAY_URL}/?${params.toString()}`
}

export const getRampSellUrl = async (
  cryptoAssetSymbol: string,
  plancks: string | bigint,
  address: string,
  currencyCode: string,
  countryCode: string,
) => {
  const remoteConfig = await remoteConfig$.getValue()

  const params = new URLSearchParams({
    hostApiKey: remoteConfig.ramps.rampApiKey,
    hostLogoUrl: TALISMAN_LOGO_URL,
    defaultFlow: "OFFRAMP",
    enabledFlows: "ONRAMP,OFFRAMP",
    hostAppName: "Talisman",
    hideExitButton: "true",

    selectedCountryCode: countryCode,
    swapAsset: cryptoAssetSymbol,
    userAddress: address,
    fiatCurrency: currencyCode,
    swapAmount: plancks.toString(),
  })

  return `${RAMPS_RAMP_PAY_URL}/?${params.toString()}`
}
