import { Token } from "@talismn/chaindata-provider"
import { RemoteConfigStoreData } from "extension-core"
import { useMemo } from "react"

import { useRemoteConfig, useToken } from "@ui/state"

import { RampsMode } from "../shared/types"
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
  mode: RampsMode,
): RampCryptoAsset | null => {
  const { data: rampAssets } = useRampTokens(currencyCode, mode)
  const token = useToken(tokenId)
  const remoteConfig = useRemoteConfig()

  return useMemo(() => {
    if (!token || !currencyCode) return null
    const type = getRampTokenType(token.type)
    const chainId = getRampChainId(remoteConfig, token.evmNetwork?.id ?? token.chain?.id ?? "")

    if (!type || !chainId) return null

    const asset = rampAssets?.assets.find(
      (a) =>
        a.chain === chainId &&
        a.type === type &&
        (token.type !== "evm-erc20" ||
          a.address?.toLowerCase() === token.contractAddress.toLowerCase()),
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

const getRampTokenType = (type: Token["type"]) => {
  switch (type) {
    case "evm-erc20":
      return "ERC20"
    case "substrate-native":
    case "evm-native":
      return "NATIVE"
    default:
      return null
  }
}

// TODO helpers ?
const getRampChainId = (remoteConfig: RemoteConfigStoreData, talismanNetworkId: string) => {
  const entry = Object.entries(remoteConfig.rampNetworks).find(
    ([, talismanId]) => talismanId === talismanNetworkId,
  )
  return entry ? entry[0] : undefined
}
