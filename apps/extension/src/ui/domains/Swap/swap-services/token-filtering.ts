import { remoteConfigStore } from "@core/domains/app/store.remoteConfig"
import type { EthNetwork, Token } from "@talismn/chaindata-provider"
import { evmErc20TokenId } from "@talismn/chaindata-provider"
import { getExtensionPublicClient } from "@ui/domains/Ethereum/usePublicClient"
import type { TFunction } from "i18next"
import { erc20Abi, isAddress } from "viem"

import type { SupportedSwapProtocol } from "../swap-modules/common.swap-module"
import {
  fetchCoingeckoAssetPlatforms,
  fetchCoingeckoCoinByAddress,
  fetchCoingeckoCoinsByCategory,
  fetchCoingeckoList,
} from "./coingecko"

// ─── Constants ──────────────────────────────────────────────────────

// ─── Token tab definitions ──────────────────────────────────────────

export type TokenTab = {
  value: string
  label: string
  coingecko?: boolean
  filter?: (tokenId: string) => boolean
  sort?: (a: string, b: string) => number
}

export const getTokenTabs = ({
  t,
  curatedTokens,
}: {
  t: TFunction
  curatedTokens?: string[]
}): TokenTab[] => [
  {
    value: "all",
    label: t("All tokens"),
    sort: curatedTokens
      ? (a, b) => {
          const ia = curatedTokens.indexOf(a)
          const ib = curatedTokens.indexOf(b)
          if (ia === -1 && ib === -1) return 0
          if (ia === -1) return 1
          if (ib === -1) return -1
          return ia - ib
        }
      : undefined,
  },
  {
    value: "popular",
    label: t("🔥 Popular"),
    filter: curatedTokens ? (tokenId) => curatedTokens.includes(tokenId) ?? false : undefined,
    sort: curatedTokens ? (a, b) => curatedTokens.indexOf(a) - curatedTokens.indexOf(b) : undefined,
  },
  {
    value: "meme-token",
    label: t("Memes"),
    coingecko: true,
  },
  {
    value: "liquid-staking-tokens",
    label: t("LSTs"),
    coingecko: true,
  },
  {
    value: "artificial-intelligence",
    label: t("AI"),
    coingecko: true,
  },
  {
    value: "depin",
    label: t("DePIN"),
    coingecko: true,
  },
  {
    value: "decentralized-finance-defi",
    label: t("Defi"),
    coingecko: true,
  },
  {
    value: "layer-2",
    label: t("L2s"),
    coingecko: true,
  },
]

// ─── Asset registry (replaces enrichAssets) ─────────────────────────

export type AssetRegistry = {
  tokenIds: string[]
  supportMap: Map<string, Set<SupportedSwapProtocol>>
}

/**
 * Build a registry of swappable tokenIds and which protocols support each one.
 * Each entry in `moduleResults` is a tuple of [protocol, tokenIds[]].
 * Only tokenIds present in `tokensMap` are included.
 */
export function buildAssetRegistry(
  moduleResults: Array<[SupportedSwapProtocol, string[]]>,
  tokensMap: Record<string, Token | undefined>
): AssetRegistry {
  const supportMap = new Map<string, Set<SupportedSwapProtocol>>()

  for (const [protocol, tokenIds] of moduleResults) {
    for (const tokenId of tokenIds) {
      if (!tokensMap[tokenId]) continue

      let protocols = supportMap.get(tokenId)
      if (!protocols) {
        protocols = new Set()
        supportMap.set(tokenId, protocols)
      }
      protocols.add(protocol)
    }
  }

  const tokenIds = [...supportMap.keys()].sort((a, b) => {
    const symA = (tokensMap[a]?.symbol ?? "").replaceAll("$", "")
    const symB = (tokensMap[b]?.symbol ?? "").replaceAll("$", "")
    return symA.localeCompare(symB)
  })

  return { tokenIds, supportMap }
}

// ─── Coingecko category matching ────────────────────────────────────

async function getCoingeckoCategoryTokenIds(
  categoryId: string,
  tokenIds: string[],
  tokensMap: Record<string, Token | undefined>
): Promise<string[]> {
  const platforms = await fetchCoingeckoAssetPlatforms()
  const coinsList = await fetchCoingeckoList()
  const coins = await fetchCoingeckoCoinsByCategory(categoryId)

  return coins
    .flatMap((c) => {
      const coinPlatforms = Object.entries(
        coinsList.find((coin) => coin.id === c.id)?.platforms ?? {}
      )
      if (coinPlatforms.length === 0) {
        return tokenIds.find((id) => {
          const token = tokensMap[id]
          return token && token.symbol.toLowerCase() === c.symbol.toLowerCase()
        })
      }

      return coinPlatforms.map(([platformId, address]) => {
        const platform = platforms.find((p) => p.id === platformId)
        return tokenIds.find((id) => {
          const token = tokensMap[id]
          if (!token) return false
          const chainId =
            token.type === "evm-native" || token.type === "evm-erc20"
              ? +token.networkId
              : token.networkId
          const contractAddress =
            token.type === "evm-erc20" ? token.contractAddress?.toLowerCase() : undefined
          return chainId === platform?.chain_identifier && contractAddress === address.toLowerCase()
        })
      })
    })
    .filter((id): id is string => !!id)
}

// ─── ERC-20 on-chain lookup ─────────────────────────────────────────

async function lookupErc20Token(
  address: string,
  chainId: number,
  evmNetworks: EthNetwork[]
): Promise<{
  tokenId: string
  symbol: string
  decimals: number
  name: string
  image?: string
  contractAddress: string
  chainId: number
} | null> {
  const network = evmNetworks.find((n) => n.id.toString() === chainId.toString())
  if (!network) return null

  const platforms = await fetchCoingeckoAssetPlatforms()
  const platform = platforms.find((p) => p.chain_identifier === chainId)
  if (!platform) return null

  const client = getExtensionPublicClient(network)
  if (!client) return null

  const [symbolData, decimalsData, namedata] = await client.multicall({
    contracts: [
      { abi: erc20Abi, address: address as `0x${string}`, functionName: "symbol" },
      { abi: erc20Abi, address: address as `0x${string}`, functionName: "decimals" },
      { abi: erc20Abi, address: address as `0x${string}`, functionName: "name" },
    ],
  })

  const symbol = symbolData.status === "success" ? symbolData.result : null
  const decimals = decimalsData.status === "success" ? decimalsData.result : null
  const name = namedata.status === "success" ? namedata.result : null
  if (!symbol || !decimals || !name) return null

  const coingeckoData = await fetchCoingeckoCoinByAddress(address, platform.id)
  const tokenId = evmErc20TokenId(chainId.toString(), address as `0x${string}`)

  return {
    tokenId,
    chainId,
    decimals,
    name,
    symbol,
    contractAddress: address,
    image: coingeckoData?.image?.small,
  }
}

// ─── Token search and tab-based filtering ───────────────────────────

export async function filterAndSortTokens(
  tokenIds: string[],
  tokensMap: Record<string, Token | undefined>,
  search: string,
  safeTokens: Set<string>,
  tokenTab: string,
  t: TFunction,
  evmNetworks?: EthNetwork[]
): Promise<string[]> {
  if (search.trim().length > 0) {
    const isSearchingAddress = isAddress(search)
    const searchLoweredCase = search.toLowerCase()
    const knownFilteredTokens = tokenIds.filter((id) => {
      const token = tokensMap[id]
      if (!token) return false
      const sym = token.symbol.toLowerCase()
      const name = "name" in token && typeof token.name === "string" ? token.name.toLowerCase() : ""
      const contractAddress =
        tokensMap[id]?.type === "evm-erc20"
          ? (tokensMap[id] as Extract<Token, { type: "evm-erc20" }>).contractAddress
          : undefined
      return (
        sym.startsWith(searchLoweredCase) ||
        name.startsWith(searchLoweredCase) ||
        (isSearchingAddress && contractAddress?.startsWith(searchLoweredCase))
      )
    })

    if (isSearchingAddress && knownFilteredTokens.length === 0 && evmNetworks) {
      const searchChainIds = [1, 42161, 8453, 56, 137, 10, 81457, 324]
      const allOnChainTokens = await Promise.all(
        searchChainIds.map((chainId) => lookupErc20Token(search, chainId, evmNetworks))
      )
      return allOnChainTokens
        .filter((tk): tk is NonNullable<typeof tk> => tk !== null)
        .map((tk) => tk.tokenId)
    }

    return knownFilteredTokens.sort((aId, bId) => {
      const a = tokensMap[aId]
      const b = tokensMap[bId]
      const aChainId = a?.type === "evm-native" || a?.type === "evm-erc20" ? +a.networkId : 0
      const bChainId = b?.type === "evm-native" || b?.type === "evm-erc20" ? +b.networkId : 0
      const aContractAddress =
        a?.type === "evm-erc20" ? a.contractAddress?.toLowerCase() : undefined
      const bContractAddress =
        b?.type === "evm-erc20" ? b.contractAddress?.toLowerCase() : undefined

      if (aId.includes("native") && !bId.includes("native")) return -1
      if (bId.includes("native") && !aId.includes("native")) return 1

      const aSafe = safeTokens.has(`${aChainId}:${aContractAddress}`)
      const bSafe = safeTokens.has(`${bChainId}:${bContractAddress}`)
      if (aSafe && !bSafe) return -1
      if (bSafe && !aSafe) return 1

      const aSymbol = (a?.symbol ?? "").toLowerCase()
      const bSymbol = (b?.symbol ?? "").toLowerCase()
      if (aSymbol === searchLoweredCase && bSymbol !== searchLoweredCase) return -1
      if (bSymbol === searchLoweredCase && aSymbol !== searchLoweredCase) return 1
      if (aSymbol === searchLoweredCase && bSymbol === searchLoweredCase) return aChainId - bChainId

      if (aSymbol.startsWith(searchLoweredCase) && !bSymbol.startsWith(searchLoweredCase)) return -1
      if (bSymbol.startsWith(searchLoweredCase) && !aSymbol.startsWith(searchLoweredCase)) return 1
      if (aSymbol.startsWith(searchLoweredCase) && bSymbol.startsWith(searchLoweredCase))
        return aChainId - bChainId

      return aSymbol.localeCompare(bSymbol)
    })
  }

  const { curatedTokens = [] } = await remoteConfigStore.get("swaps")
  const tokenTabs = getTokenTabs({ t, curatedTokens })
  const filter = tokenTabs.find((tb) => tb.value === tokenTab)?.filter
  const sort = tokenTabs.find((tb) => tb.value === tokenTab)?.sort
  const coingeckoCategoryId = tokenTabs.find((tb) => tb.value === tokenTab && tb.coingecko)?.value

  let filteredSortedTokens = [...tokenIds]
  if (filter) filteredSortedTokens = filteredSortedTokens.filter(filter)
  if (sort) filteredSortedTokens = filteredSortedTokens.sort(sort)
  if (coingeckoCategoryId)
    filteredSortedTokens = await getCoingeckoCategoryTokenIds(
      coingeckoCategoryId,
      filteredSortedTokens,
      tokensMap
    )

  return filteredSortedTokens
}
