import type { SupportedSwapProtocol } from "./swap-modules/common.swap-module"
import type { AssetRegistry } from "./swap-services/token-filtering"

export type SerializableAssetRegistry = {
  tokenIds: string[]
  supportMapEntries: Array<[string, SupportedSwapProtocol[]]>
}

export const serializeAssetRegistry = ({
  tokenIds,
  supportMap,
}: AssetRegistry): SerializableAssetRegistry => ({
  tokenIds,
  supportMapEntries: [...supportMap].map(([tokenId, protocols]) => [tokenId, [...protocols]]),
})

export const deserializeAssetRegistry = ({
  tokenIds,
  supportMapEntries,
}: SerializableAssetRegistry): AssetRegistry => ({
  tokenIds,
  supportMap: new Map(
    supportMapEntries.map(([tokenId, protocols]) => [tokenId, new Set(protocols)])
  ),
})

export type SerializableSafeTokens = string[]

export const serializeSafeTokens = (safeTokens: Set<string>): SerializableSafeTokens => [
  ...safeTokens,
]

export const deserializeSafeTokens = (safeTokens: SerializableSafeTokens): Set<string> =>
  new Set(safeTokens)
