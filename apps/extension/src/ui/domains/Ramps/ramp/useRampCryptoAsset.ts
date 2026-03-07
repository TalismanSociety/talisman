import type { RemoteConfigStoreData } from "@core/types/domains"
import type { Token } from "@talismn/chaindata-provider"
import { useToken } from "@ui/state/chaindata"
import { useRemoteConfig } from "@ui/state/remoteConfig"
import { useMemo } from "react"

import type { RampsMode } from "../shared/types"
import { useRampTokens } from "./useRampTokens"

export type RampCryptoAsset = {
  id: string
  min: number | null
  max: number | null
  price: number
  currencyCode: string
}

export const useRampCryptoAsset = (
  currencyCode: string | undefined,
  tokenId: string | undefined,
  mode: RampsMode
): RampCryptoAsset | null => {
  const { data: rampAssets } = useRampTokens(currencyCode, mode)
  const token = useToken(tokenId)
  const remoteConfig = useRemoteConfig()

  return useMemo(() => {
    if (!token || !currencyCode) return null
    const type = getRampTokenType(token)
    const chainId = getRampChainId(remoteConfig, token.networkId ?? token.networkId ?? "")

    if (!type || !chainId) return null

    const asset = rampAssets?.assets.find(
      (a) =>
        a.chain === chainId &&
        a.type === type &&
        (token.type !== "evm-erc20" ||
          a.address?.toLowerCase() === token.contractAddress.toLowerCase()) &&
        (token.type !== "substrate-assets" || token.assetId === a.address)
    )

    return asset
      ? {
          id: `${asset.chain}_${asset.symbol}`,
          min: asset.minPurchaseAmount === -1 ? null : asset.minPurchaseAmount,
          max: asset.maxPurchaseAmount === -1 ? null : asset.maxPurchaseAmount,
          price: asset.price[currencyCode],
          currencyCode,
        }
      : null
  }, [rampAssets?.assets, remoteConfig, token, currencyCode])
}

const getRampTokenType = (token: Token) => {
  switch (token.type) {
    case "evm-erc20":
      return "ERC20"
    case "substrate-native":
    case "evm-native":
      return "NATIVE"
    case "substrate-assets":
      return token.networkId === "polkadot-asset-hub" ? "DOT_AH" : null
    default:
      return null
  }
}

const getRampChainId = (remoteConfig: RemoteConfigStoreData, talismanNetworkId: string) => {
  const entry = Object.entries(remoteConfig.ramps.rampNetworks).find(
    ([, talismanId]) => talismanId === talismanNetworkId
  )
  return entry ? entry[0] : undefined
}
