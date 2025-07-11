import {
  AnyMiniMetadata,
  SubAssetsToken,
  SubAssetsTokenSchema,
  subAssetTokenId,
} from "@talismn/chaindata-provider"
import { getStorageKeyPrefix, parseMetadataRpc } from "@talismn/scale"
import { assign, keyBy, keys } from "lodash-es"
import { Binary } from "polkadot-api"

import { IBalanceModule } from "../../types/IBalanceModule"
import { QueryStorageResult } from "../shared"
import { MODULE_TYPE, TokenConfig } from "./config"

export const fetchTokens: IBalanceModule<typeof MODULE_TYPE, TokenConfig>["fetchTokens"] = async ({
  networkId,
  tokens,
  connector,
  miniMetadata,
}) => {
  const anyMiniMetadata = miniMetadata as AnyMiniMetadata
  if (!anyMiniMetadata?.data) return []

  const { builder } = parseMetadataRpc(anyMiniMetadata.data)
  const assetCodec = builder.buildStorage("Assets", "Asset")
  const metadataCodec = builder.buildStorage("Assets", "Metadata")

  const [allAssetStorageKeys, allMetadataStorageKeys] = await Promise.all([
    connector.send<`0x${string}`[]>(networkId, "state_getKeys", [
      getStorageKeyPrefix("Assets", "Asset"),
    ]),
    connector.send<`0x${string}`[]>(networkId, "state_getKeys", [
      getStorageKeyPrefix("Assets", "Metadata"),
    ]),
  ])

  const [assetStorageResults, metadataStorageResults] = await Promise.all([
    connector.send<QueryStorageResult>(networkId, "state_queryStorageAt", [allAssetStorageKeys]),
    connector.send<QueryStorageResult>(networkId, "state_queryStorageAt", [allMetadataStorageKeys]),
  ])

  const assetStorageEntries = assetStorageResults.length ? assetStorageResults[0].changes : []
  const metadataStorageEntries = metadataStorageResults.length
    ? metadataStorageResults[0].changes
    : []

  const assetByAssetId = keyBy(
    assetStorageEntries.map(([key, value]) => {
      const [assetId] = assetCodec.keys.dec(key) as [number]
      const asset = assetCodec.value.dec(value) as {
        is_sufficient: boolean
        min_balance: bigint
      }
      return { assetId, existentialDeposit: asset.min_balance, isSufficient: asset.is_sufficient }
    }),
    (a) => a.assetId,
  )

  const metadataByAssetId = keyBy(
    metadataStorageEntries.map(([key, value]) => {
      const [assetId] = metadataCodec.keys.dec(key) as [number]
      const metadata = metadataCodec.value.dec(value) as {
        decimals?: number
        deposit?: bigint
        is_frozen?: boolean
        name?: Binary
        symbol?: Binary
      }
      return {
        assetId,
        decimals: metadata.decimals,
        isFrozen: metadata.is_frozen,
        name: metadata.name?.asText(),
        symbol: metadata.symbol?.asText(),
      }
    }),
    (a) => a.assetId,
  )

  const allTokens = keys(assetByAssetId).map((assetId) =>
    assign({}, assetByAssetId[assetId], metadataByAssetId[assetId] ?? undefined),
  )

  const configTokenByAssetId = keyBy(tokens, (t) => t.assetId)

  return (
    allTokens
      .map(
        (asset): SubAssetsToken => ({
          id: subAssetTokenId(networkId, String(asset.assetId)),
          type: MODULE_TYPE,
          platform: "polkadot",
          networkId,
          assetId: String(asset.assetId),
          isSufficient: asset.isSufficient,
          isFrozen: asset.isFrozen,
          name: asset.name,
          symbol: asset.symbol as string,
          decimals: asset.decimals ?? 0,
          existentialDeposit: String(asset.existentialDeposit),
          isDefault: true,
        }),
      )
      // keep all tokens listed in the config + all tokens marked as sufficient
      .filter((token) => {
        const configToken = configTokenByAssetId[token.assetId]
        return configToken || token.isSufficient
      })
      // apply config overrides
      .map((token) => {
        const configToken = configTokenByAssetId[token.assetId]
        return configToken ? assign({}, token, configToken) : token
      })
      // validate results
      .filter((t) => {
        const parsed = SubAssetsTokenSchema.safeParse(t)
        // if (!parsed.success) log.warn(`Ignoring invalid token ${MODULE_TYPE}`, t)

        return parsed.success
      })
  )
}
