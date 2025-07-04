import {
  AnyMiniMetadata,
  SubHydrationToken,
  subHydrationTokenId,
  SubHydrationTokenSchema,
} from "@talismn/chaindata-provider"
import { decAnyMetadata, getDynamicBuilder, getLookupFn, unifyMetadata } from "@talismn/scale"
import { log } from "extension-shared"
import { assign, keyBy } from "lodash"
import { Binary } from "polkadot-api"

import { IBalanceModule } from "../IBalanceModule"
import { MODULE_TYPE } from "./config"
import { SubHydrationTokenConfig } from "./types"
import { getStorageKeyPrefix } from "./utils"

export const fetchTokens: IBalanceModule<
  typeof MODULE_TYPE,
  SubHydrationTokenConfig
>["fetchTokens"] = async ({ networkId, tokens, connector, miniMetadata }) => {
  const anyMiniMetadata = miniMetadata as AnyMiniMetadata
  if (!anyMiniMetadata?.data) return []

  const metadata = unifyMetadata(decAnyMetadata(anyMiniMetadata.data))
  const scaleBuilder = getDynamicBuilder(getLookupFn(metadata))
  const assetsCodec = scaleBuilder.buildStorage("AssetRegistry", "Assets")

  const allAssetStorageKeys = await connector.send<`0x${string}`[]>(networkId, "state_getKeys", [
    getStorageKeyPrefix("AssetRegistry", "Assets"),
  ])

  const assetStorageResults = await connector.send(networkId, "state_queryStorageAt", [
    allAssetStorageKeys,
  ])

  const assetStorageEntries: [key: `0x${string}`, value: `0x${string}`][] =
    assetStorageResults[0].changes

  const configTokenByAssetId = keyBy(tokens, (t) => t.onChainId)

  return (
    assetStorageEntries
      .map(([key, value]) => {
        // parse results
        const [onChainId] = assetsCodec.keys.dec(key) as [number]
        const asset = assetsCodec.value.dec(value) as {
          name: Binary | undefined
          symbol: Binary | undefined
          decimals: number | undefined
          is_sufficient: boolean
          asset_type: { type: string }
          existential_deposit: bigint
        }

        return {
          onChainId,
          assetType: asset.asset_type.type,
          isSufficient: asset.is_sufficient,
          name: asset.name?.asText(),
          symbol: asset.symbol?.asText(),
          decimals: asset.decimals,
          existentialDeposit: asset.existential_deposit.toString(),
        }
      })
      // exclude unsupported asset types
      .filter(({ assetType }) => ["Erc20", "Token"].includes(assetType))
      // convert asset to a SubHydrationToken
      .map(
        (asset): SubHydrationToken => ({
          id: subHydrationTokenId(networkId, asset.onChainId),
          type: MODULE_TYPE,
          platform: "polkadot",
          networkId,
          onChainId: asset.onChainId,
          assetType: asset.assetType as SubHydrationToken["assetType"], // Erc20 or Token,
          isSufficient: asset.isSufficient,
          name: asset.name,
          symbol: asset.symbol as string,
          decimals: asset.decimals ?? 0,
          existentialDeposit: asset.existentialDeposit,
          isDefault: true,
        }),
      )
      // keep all tokens listed in the config + all tokens marked as sufficient
      .filter((token) => {
        const configToken = configTokenByAssetId[token.onChainId]
        return configToken || token.isSufficient
      })
      // apply config overrides
      .map((token) => {
        const configToken = configTokenByAssetId[token.onChainId]
        return configToken ? assign({}, token, configToken) : token
      })
      // validate results
      .filter((t) => {
        const parsed = SubHydrationTokenSchema.safeParse(t)
        if (!parsed.success) log.warn("Ignoring token invalid substrate-hydration token", t)

        return parsed.success
      })
  )
}
