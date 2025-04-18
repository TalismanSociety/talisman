import { remoteConfig$ } from "@ui/state"

const TALISMAN_LOGO_URL =
  "https://raw.githubusercontent.com/TalismanSociety/talisman-web/0fa6f5a99b4729f740c1a68bbe3d2ca9c85c9daa/apps/portal/public/talisman.svg"

export const getRampBuyUrl = async (
  currencyCode: string,
  amount: number,
  cryptoAssetSymbol: string,
  address: string,
) => {
  const remoteConfig = await remoteConfig$.getValue()

  const params = new URLSearchParams({
    hostApiKey: remoteConfig.rampConfig.rampApiKey,
    hostLogoUrl: TALISMAN_LOGO_URL,
    defaultFlow: "ONRAMP",
    enabledFlows: "ONRAMP,OFFRAMP",
    hostAppName: "Talisman",

    swapAsset: cryptoAssetSymbol,
    userAddress: address,
    fiatCurrency: currencyCode,
    fiatValue: amount.toString(),
  })

  // // Dynamically add the amount parameter based on the dirtyAmountField
  // if (dirtyAmountField === "fiatAmount") {
  //   params.append("fiatValue", fiatAmount.toString())
  // } else {
  //   params.append(
  //     "swapAmount",
  //     tokensToPlanck(tokenAmount.toString(), rampTokenAsset.decimals).toString(),
  //   )
  // }

  return `${remoteConfig.rampConfig.rampBasePath}/?${params.toString()}`
}

export const getRampSellUrl = async (
  cryptoAssetSymbol: string,
  plancks: string | bigint,
  address: string,
  currencyCode: string,
) => {
  const remoteConfig = await remoteConfig$.getValue()

  const params = new URLSearchParams({
    hostApiKey: remoteConfig.rampConfig.rampApiKey,
    hostLogoUrl: TALISMAN_LOGO_URL,
    defaultFlow: "ONRAMP",
    enabledFlows: "ONRAMP,OFFRAMP",
    hostAppName: "Talisman",

    swapAsset: cryptoAssetSymbol,
    userAddress: address,
    fiatCurrency: currencyCode,
    swapAmount: plancks.toString(),
  })

  return `${remoteConfig.rampConfig.rampBasePath}/?${params.toString()}`
}
