// biome-ignore-all lint/suspicious/noExplicitAny: legacy

import { remoteConfigStore } from "@core/domains/app/store.remoteConfig"
import { evmErc20TokenId } from "@talismn/chaindata-provider"
import { getExtensionPublicClient } from "@ui/domains/Ethereum/usePublicClient"
import type { TFunction } from "i18next"
import { erc20Abi, isAddress } from "viem"
import type { Chain as ViemChain } from "viem/chains"

import type {
  SwappableAssetBaseType,
  SwappableAssetWithDecimals,
} from "../swap-modules/common.swap-module"
import { allEvmChains } from "../swaps-port/allEvmChains"
import {
  fetchCoingeckoAssetPlatforms,
  fetchCoingeckoCoinByAddress,
  fetchCoingeckoCoinsByCategory,
  fetchCoingeckoList,
} from "./coingecko"

// ─── Constants ──────────────────────────────────────────────────────

const ETH_LOGO =
  "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/eth.svg"
const BTC_LOGO = "https://assets.coingecko.com/coins/images/1/standard/bitcoin.png?1696501400"

const btcTokens: Record<string, { symbol: string; decimals: number; image: string }> = {
  "btc-native": {
    symbol: "BTC",
    decimals: 8,
    image: BTC_LOGO,
  },
}

// ─── Token tab definitions ──────────────────────────────────────────

export type TokenTab = {
  value: string
  label: string
  coingecko?: boolean
  filter?: (token: SwappableAssetWithDecimals) => boolean
  sort?: (a: SwappableAssetWithDecimals, b: SwappableAssetWithDecimals) => number
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
      ? (a, b) => curatedTokens.indexOf(a.id) - curatedTokens.indexOf(b.id)
      : undefined,
  },
  {
    value: "popular",
    label: t("🔥 Popular"),
    filter: curatedTokens ? (token) => curatedTokens.includes(token.id) ?? false : undefined,
    sort: curatedTokens
      ? (a, b) => curatedTokens.indexOf(a.id) - curatedTokens.indexOf(b.id)
      : undefined,
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

// ─── Asset enrichment ───────────────────────────────────────────────

export function enrichAssets(
  assets: SwappableAssetBaseType[],
  tokensMap: Record<string, { symbol?: string; decimals?: number } | undefined>
): SwappableAssetWithDecimals[] {
  const byChainId: Record<string, Record<string, SwappableAssetWithDecimals>> = {}

  for (const cur of assets) {
    const chainKey = cur.chainId.toString()
    const chainAssets = byChainId[chainKey] ?? {}
    const tokenDetails = tokensMap[cur.id] ?? btcTokens[cur.id as "btc-native"]

    const symbol = tokenDetails?.symbol ?? cur.symbol
    const decimals = tokenDetails?.decimals ?? cur.decimals
    const image = symbol?.toLowerCase() === "eth" ? ETH_LOGO : cur.image
    if (!symbol || !decimals) continue

    chainAssets[cur.id] = {
      ...cur,
      symbol,
      decimals,
      image,
      context: {
        ...chainAssets[cur.id]?.context,
        ...cur.context,
      },
    }
    byChainId[chainKey] = chainAssets
  }

  return Object.values(byChainId).flatMap((tokens) =>
    Object.values(tokens).sort((a, b) =>
      a.symbol.replaceAll("$", "").localeCompare(b.symbol.replaceAll("$", ""))
    )
  )
}

// ─── Coingecko category matching ────────────────────────────────────

async function getCoingeckoCategoryTokens(
  categoryId: string,
  tokens: SwappableAssetWithDecimals[]
): Promise<SwappableAssetWithDecimals[]> {
  const platforms = await fetchCoingeckoAssetPlatforms()
  const coinsList = await fetchCoingeckoList()
  const coins = await fetchCoingeckoCoinsByCategory(categoryId)

  return coins
    .flatMap((c) => {
      const coinPlatforms = Object.entries(
        coinsList.find((coin) => coin.id === c.id)?.platforms ?? {}
      )
      if (coinPlatforms.length === 0) {
        const token = tokens.find((t) => t.symbol.toLowerCase() === c.symbol.toLowerCase())
        if (token && !token.image && c.image) token.image = c.image
        return token
      }

      return coinPlatforms.map(([platformId, address]) => {
        const platform = platforms.find((p) => p.id === platformId)
        const token = tokens.find(
          (t) =>
            (t.networkType === "evm" ? +t.chainId : t.chainId) === platform?.chain_identifier &&
            t.contractAddress?.toLowerCase() === address.toLowerCase()
        )
        if (token && !token.image && c.image) token.image = c.image
        return token
      })
    })
    .filter((c): c is SwappableAssetWithDecimals => !!c)
}

// ─── ERC-20 on-chain lookup ─────────────────────────────────────────

async function lookupErc20Token(
  address: string,
  chainId: number,
  evmNetworks: { id: string }[]
): Promise<SwappableAssetWithDecimals | null> {
  const chain: ViemChain | undefined = Object.values(allEvmChains).find((c) => c?.id === chainId)
  if (!chain) return null

  const network = evmNetworks.find((n) => n.id.toString() === chainId.toString())
  if (!network) return null

  const platforms = await fetchCoingeckoAssetPlatforms()
  const platform = platforms.find((p) => p.chain_identifier === chainId)
  if (!platform) return null

  const client = getExtensionPublicClient(network as any)
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
  const id = evmErc20TokenId(chainId.toString(), address as `0x${string}`)

  return {
    id,
    chainId,
    context: {},
    decimals,
    name,
    symbol,
    networkType: "evm",
    contractAddress: address,
    image: coingeckoData?.image?.small,
  }
}

// ─── Token search and tab-based filtering ───────────────────────────

export async function filterAndSortTokens(
  tokens: SwappableAssetWithDecimals[],
  search: string,
  safeTokens: Set<string>,
  tokenTab: string,
  t: TFunction,
  evmNetworks?: { id: string }[]
): Promise<SwappableAssetWithDecimals[]> {
  if (search.trim().length > 0) {
    const isSearchingAddress = isAddress(search)
    const searchLoweredCase = search.toLowerCase()
    const knownFilteredTokens = tokens.filter(
      (tk) =>
        tk.symbol.toLowerCase().startsWith(searchLoweredCase) ||
        tk.name.toLowerCase().startsWith(searchLoweredCase) ||
        (isSearchingAddress && tk.contractAddress?.startsWith(searchLoweredCase))
    )

    if (isSearchingAddress && knownFilteredTokens.length === 0 && evmNetworks) {
      const allOnChainTokens = await Promise.all(
        [
          allEvmChains.mainnet,
          allEvmChains.arbitrum,
          allEvmChains.base,
          allEvmChains.bsc,
          allEvmChains.polygon,
          allEvmChains.optimism,
          allEvmChains.blast,
          allEvmChains.zkSync,
        ]
          .flatMap((chain) => (chain ? chain : []))
          .map((chain: ViemChain) => lookupErc20Token(search, chain.id, evmNetworks))
      )
      return allOnChainTokens.filter((tk): tk is SwappableAssetWithDecimals => tk !== null)
    }

    return knownFilteredTokens.sort((a, b) => {
      if (a.id.includes("native") && !b.id.includes("native")) return -1
      if (b.id.includes("native") && !a.id.includes("native")) return 1

      const aSafe = safeTokens.has(`${a.chainId}:${a.contractAddress?.toLowerCase()}`)
      const bSafe = safeTokens.has(`${b.chainId}:${b.contractAddress?.toLowerCase()}`)
      if (aSafe && !bSafe) return -1
      if (bSafe && !aSafe) return 1

      const aSymbol = a.symbol.toLowerCase()
      const bSymbol = b.symbol.toLowerCase()
      if (aSymbol === searchLoweredCase && bSymbol !== searchLoweredCase) return -1
      if (bSymbol === searchLoweredCase && aSymbol !== searchLoweredCase) return 1
      if (aSymbol === searchLoweredCase && bSymbol === searchLoweredCase)
        return +a.chainId - +b.chainId

      if (aSymbol.startsWith(searchLoweredCase) && !bSymbol.startsWith(searchLoweredCase)) return -1
      if (bSymbol.startsWith(searchLoweredCase) && !aSymbol.startsWith(searchLoweredCase)) return 1
      if (aSymbol.startsWith(searchLoweredCase) && bSymbol.startsWith(searchLoweredCase))
        return +a.chainId - +b.chainId

      return a.symbol.localeCompare(b.symbol)
    })
  }

  const { curatedTokens = [] } = await remoteConfigStore.get("swaps")
  const tokenTabs = getTokenTabs({ t, curatedTokens })
  const filter = tokenTabs.find((tb) => tb.value === tokenTab)?.filter
  const sort = tokenTabs.find((tb) => tb.value === tokenTab)?.sort
  const coingeckoCategoryId = tokenTabs.find((tb) => tb.value === tokenTab && tb.coingecko)?.value

  let filteredSortedTokens = [...tokens]
  if (filter) filteredSortedTokens = filteredSortedTokens.filter(filter)
  if (sort) filteredSortedTokens = filteredSortedTokens.sort(sort)
  if (coingeckoCategoryId)
    filteredSortedTokens = await getCoingeckoCategoryTokens(
      coingeckoCategoryId,
      filteredSortedTokens
    )

  return filteredSortedTokens
}
