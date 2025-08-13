import {
  AnyMiniMetadata,
  SubForeignAssetsToken,
  SubForeignAssetsTokenSchema,
  subForeignAssetTokenId,
} from "@talismn/chaindata-provider"
import { getStorageKeyPrefix, papiStringify, parseMetadataRpc } from "@talismn/scale"
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
  const assetCodec = builder.buildStorage("ForeignAssets", "Asset")
  const metadataCodec = builder.buildStorage("ForeignAssets", "Metadata")

  const [allAssetStorageKeys, allMetadataStorageKeys] = await Promise.all([
    connector.send<`0x${string}`[]>(networkId, "state_getKeys", [
      getStorageKeyPrefix("ForeignAssets", "Asset"),
    ]),
    connector.send<`0x${string}`[]>(networkId, "state_getKeys", [
      getStorageKeyPrefix("ForeignAssets", "Metadata"),
    ]),
  ])

  const [assetStorageResults, metadataStorageResults] = await Promise.all([
    connector.send<QueryStorageResult>(networkId, "state_queryStorageAt", [allAssetStorageKeys]),
    connector.send<QueryStorageResult>(networkId, "state_queryStorageAt", [allMetadataStorageKeys]),
  ])

  // if there is at least one storage entry, the results will be an array with a single object
  // some networks avec the pallet with no tokens in it, in which case the response will be an empty array
  const assetStorageEntries: [key: `0x${string}`, value: `0x${string}`][] =
    assetStorageResults[0]?.changes ?? []
  const metadataStorageEntries: [key: `0x${string}`, value: `0x${string}`][] =
    metadataStorageResults[0]?.changes ?? []

  const assetByOnChainId = keyBy(
    assetStorageEntries.map(([key, value]) => {
      const [decodedKey] = assetCodec.keys.dec(key) as [unknown]
      const onChainId = papiStringify(decodedKey)
      const asset = assetCodec.value.dec(value) as {
        is_sufficient: boolean
        min_balance: bigint
      }
      return { onChainId, existentialDeposit: asset.min_balance, isSufficient: asset.is_sufficient }
    }),
    (a) => a.onChainId,
  )

  const metadataByOnChainId = keyBy(
    metadataStorageEntries.map(([key, value]) => {
      const [decodedKey] = metadataCodec.keys.dec(key) as [unknown]
      const onChainId = papiStringify(decodedKey)
      const metadata = metadataCodec.value.dec(value) as {
        decimals?: number
        deposit?: bigint
        is_frozen?: boolean
        name?: Binary
        symbol?: Binary
      }
      return {
        onChainId,
        decimals: metadata.decimals,
        isFrozen: metadata.is_frozen,
        name: metadata.name?.asText(),
        symbol: metadata.symbol?.asText(),
      }
    }),
    (a) => a.onChainId,
  )

  const allTokens = keys(assetByOnChainId).map((onChainId) =>
    assign({}, assetByOnChainId[onChainId], metadataByOnChainId[onChainId] ?? undefined),
  )

  const configTokenByOnChainId = keyBy(tokens, (t) => t.onChainId)

  return (
    allTokens
      .map(
        (asset): SubForeignAssetsToken => ({
          id: subForeignAssetTokenId(networkId, asset.onChainId),
          type: MODULE_TYPE,
          platform: "polkadot",
          networkId,
          onChainId: String(asset.onChainId),
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
        const configToken = configTokenByOnChainId[token.onChainId]
        return configToken || token.isSufficient
      })
      // apply config overrides
      .map((token) => {
        const configToken = configTokenByOnChainId[token.onChainId]
        return configToken ? assign({}, token, configToken) : token
      })
      // validate results
      .filter((t) => {
        const parsed = SubForeignAssetsTokenSchema.safeParse(t)
        // if (!parsed.success) log.warn(`Ignoring invalid token ${MODULE_TYPE}`, t)

        return parsed.success
      })
  )
}
