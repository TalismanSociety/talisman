import { isEthereumAddress, isSolanaAddress } from "@talismn/crypto"

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

const UNISWAP_SOLANA_CHAIN_ID = 501000101

export const getUniswapSafeTokenKey = ({
  chainId,
  address,
}: {
  chainId: number
  address: string
}) =>
  chainId === UNISWAP_SOLANA_CHAIN_ID
    ? `solana-mainnet:${address}`
    : `${chainId}:${address.toLowerCase()}`

/**
 * The safe-token keys of a Uniswap token-list response, read by shape rather than cast: an entry
 * counts only with a positive integer `chainId` and an address of that chain's format, every
 * other entry is left out. A response that is not a token list (no `tokens` array, such as an
 * error object served with a 200) or that holds no valid entry throws, so it counts as a failed
 * list rather than an empty one.
 */
export const getUniswapSafeTokenKeys = (data: unknown): Set<string> => {
  const tokens = (data as { tokens?: unknown } | null)?.tokens
  if (!Array.isArray(tokens)) throw new Error("Not a token list")
  const keys = new Set<string>()
  for (const entry of tokens) {
    const { chainId, address } = (entry ?? {}) as { chainId?: unknown; address?: unknown }
    if (typeof chainId !== "number" || !Number.isInteger(chainId) || chainId <= 0) continue
    if (typeof address !== "string") continue
    const isValid =
      chainId === UNISWAP_SOLANA_CHAIN_ID ? isSolanaAddress(address) : isEthereumAddress(address)
    if (isValid) keys.add(getUniswapSafeTokenKey({ chainId, address }))
  }
  if (!keys.size) throw new Error("Token list has no valid entries")
  return keys
}

export const serializeSafeTokens = (safeTokens: Set<string>): SerializableSafeTokens => [
  ...safeTokens,
]

export const deserializeSafeTokens = (safeTokens: SerializableSafeTokens): Set<string> =>
  new Set(safeTokens)
