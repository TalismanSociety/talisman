// biome-ignore-all lint/suspicious/noExplicitAny: legacy

import {
  isAccountCompatibleWithNetwork,
  isAddressCompatibleWithNetwork,
} from "@core/domains/accounts/helpers"
import { remoteConfigStore } from "@core/domains/app/store.remoteConfig"
import {
  isAccountAddressEthereum,
  isAccountAddressSs58,
  isAccountPlatformEthereum,
  isAccountPlatformPolkadot,
} from "@core/domains/keyring/exports"
import { evmErc20TokenId } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { getExtensionPublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { lifiSwapModule } from "@ui/domains/Swap/swap-modules/lifi-swap-module"
import { useAccounts } from "@ui/state/accounts"
import { useNetworkById, useNetworks, useTokensMap } from "@ui/state/chaindata"
import { useTokenRatesMap } from "@ui/state/tokenRates"
import BigNumber from "bignumber.js"
import type { TFunction } from "i18next"
import { useCallback, useEffect, useMemo, useState } from "react"
import { encodeFunctionData, erc20Abi, isAddress } from "viem"
import type { Chain as ViemChain } from "viem/chains"

import type {
  ApprovalInfo,
  BaseQuote,
  QuoteParams,
  SupportedSwapProtocol,
  SwappableAssetBaseType,
  SwappableAssetWithDecimals,
} from "./swap-modules/common.swap-module"
import { simpleswapSwapModule } from "./swap-modules/simpleswap-swap-module"
import { stealthexSwapModule } from "./swap-modules/stealthex-swap-module"
import { allEvmChains } from "./swaps-port/allEvmChains"
import { Decimal } from "./swaps-port/Decimal"

// ─── Loadable type (replaces jotai's Loadable) ─────────────────────

export type Loadable<T> =
  | { state: "loading" }
  | { state: "hasData"; data: T }
  | { state: "hasError"; error: unknown }

// ─── Constants ──────────────────────────────────────────────────────

export const swapModules = [simpleswapSwapModule, stealthexSwapModule, lifiSwapModule]

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

// ─── Coingecko data cache ───────────────────────────────────────────

const dataCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function cachedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = dataCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data as T
  const data = await fetcher()
  dataCache.set(key, { data, timestamp: Date.now() })
  return data
}

async function getCoingeckoConfig() {
  const { coingecko } = await remoteConfigStore.get()
  return coingecko
}

async function fetchCoingeckoAssetPlatforms(): Promise<
  {
    id: string
    chain_identifier: string | number | null
    name: string
    shortname: string
    native_coin_id: string
  }[]
> {
  return cachedFetch("coingecko-asset-platforms", async () => {
    const { apiUrl, apiKeyName, apiKeyValue } = await getCoingeckoConfig()
    const response = await fetch(`${apiUrl}/api/v3/asset_platforms`, {
      headers: apiKeyName && apiKeyValue ? { [apiKeyName]: apiKeyValue } : {},
    })
    return response.json()
  })
}

async function fetchCoingeckoList(): Promise<{ id: string; platforms: Record<string, string> }[]> {
  return cachedFetch("coingecko-list", async () => {
    const { apiUrl, apiKeyName, apiKeyValue } = await getCoingeckoConfig()
    const response = await fetch(`${apiUrl}/api/v3/coins/list?include_platform=true`, {
      headers: apiKeyName && apiKeyValue ? { [apiKeyName]: apiKeyValue } : {},
    })
    return response.json()
  })
}

async function fetchCoingeckoCoinsByCategory(
  category: string
): Promise<{ symbol: string; id: string; image?: string }[]> {
  return cachedFetch(`coingecko-category-${category}`, async () => {
    const { apiUrl, apiKeyName, apiKeyValue } = await getCoingeckoConfig()
    const response = await fetch(
      `${apiUrl}/api/v3/coins/markets?vs_currency=usd&category=${category}&include_platform=true`,
      { headers: apiKeyName && apiKeyValue ? { [apiKeyName]: apiKeyValue } : {} }
    )
    return response.json()
  })
}

async function fetchCoingeckoCoinByAddress(
  address: string,
  platformId: string
): Promise<{ image?: { large: string; small: string; thumb: string } } | null> {
  return cachedFetch(`coingecko-coin-${address}:${platformId}`, async () => {
    const { apiUrl, apiKeyName, apiKeyValue } = await getCoingeckoConfig()
    const response = await fetch(`${apiUrl}/api/v3/coins/${platformId}/contract/${address}`, {
      headers: apiKeyName && apiKeyValue ? { [apiKeyName]: apiKeyValue } : {},
    })
    return response.json()
  })
}

// ─── Pure utility functions ─────────────────────────────────────────

export const getTokenTabs = ({
  t,
  curatedTokens,
}: {
  t: TFunction
  curatedTokens?: string[]
}): {
  value: string
  label: string
  coingecko?: boolean
  filter?: (token: SwappableAssetWithDecimals) => boolean
  sort?: (a: SwappableAssetWithDecimals, b: SwappableAssetWithDecimals) => number
}[] => [
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

function enrichAssets(
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

// ─── Asset-fetching helpers ─────────────────────────────────────────

const withRetry = async <T>(
  fn: () => Promise<T>,
  signal: AbortSignal,
  retries = 3
): Promise<T | never[]> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    if (signal.aborted) return []
    try {
      return await fn()
    } catch (cause) {
      if (signal.aborted) return []
      if (attempt === retries) {
        // biome-ignore lint/suspicious/noConsole: legacy
        console.warn(`Asset fetch failed ${retries} times, ignoring`, cause)
        return []
      }
      await new Promise((resolve) => setTimeout(resolve, 100 * attempt))
    }
  }
  return []
}

// ─── Hooks ──────────────────────────────────────────────────────────

/**
 * Fetches from/to assets from all swap modules, enriches with token map data.
 * Returns Loadable states for both from and to asset lists.
 */
export const useSwapAssets = (
  fromAsset: SwappableAssetWithDecimals | null,
  tokenTab: string,
  t: TFunction,
  safeTokens: Set<string>
) => {
  const tokensMap = useTokensMap()
  const [fromAssetsLoadable, setFromAssetsLoadable] = useState<
    Loadable<SwappableAssetWithDecimals[]>
  >({ state: "loading" })
  const [toAssetsLoadable, setToAssetsLoadable] = useState<Loadable<SwappableAssetWithDecimals[]>>({
    state: "loading",
  })

  // Fetch from assets
  useEffect(() => {
    const controller = new AbortController()
    setFromAssetsLoadable({ state: "loading" })

    const run = async () => {
      try {
        const results = await Promise.all(
          swapModules.map((m) =>
            withRetry(() => m.getFromAssets(controller.signal), controller.signal)
          )
        )
        if (controller.signal.aborted) return

        const enriched = enrichAssets(results.flat() as SwappableAssetBaseType[], tokensMap)
        // from assets should not include btc
        const filtered = enriched.filter((tk) => tk.networkType !== "btc")

        // Apply tab-based filtering
        const tabFiltered = await filterAndSortTokens(filtered, "", safeTokens, tokenTab, t)
        if (controller.signal.aborted) return

        setFromAssetsLoadable({ state: "hasData", data: tabFiltered })
      } catch (error) {
        if (controller.signal.aborted) return
        setFromAssetsLoadable({ state: "hasError", error })
      }
    }
    run()

    return () => controller.abort()
  }, [tokensMap, tokenTab, t, safeTokens])

  // Fetch to assets
  useEffect(() => {
    const controller = new AbortController()
    setToAssetsLoadable({ state: "loading" })

    const run = async () => {
      try {
        const modules = swapModules.filter((m) =>
          fromAsset ? fromAsset.context[m.protocol] : true
        )
        const results = await Promise.all(
          modules.map((m) =>
            withRetry(() => m.getToAssets(fromAsset, controller.signal), controller.signal)
          )
        )
        if (controller.signal.aborted) return

        const enriched = enrichAssets(results.flat() as SwappableAssetBaseType[], tokensMap)
        const tabFiltered = await filterAndSortTokens(enriched, "", safeTokens, tokenTab, t)
        if (controller.signal.aborted) return

        setToAssetsLoadable({ state: "hasData", data: tabFiltered })
      } catch (error) {
        if (controller.signal.aborted) return
        setToAssetsLoadable({ state: "hasError", error })
      }
    }
    run()

    return () => controller.abort()
  }, [fromAsset, tokensMap, tokenTab, t, safeTokens])

  return { fromAssetsLoadable, toAssetsLoadable }
}

/**
 * Fetches safe token sets from Uniswap + Talisman remote config.
 */
export const useSafeTokens = () => {
  const [safeTokensLoadable, setSafeTokensLoadable] = useState<Loadable<Set<string>>>({
    state: "loading",
  })

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        const [uniswapSafe, uniswapExtended, talismanSafe] = await Promise.all([
          fetch("https://tokens.uniswap.org/")
            .then((r) => r.json())
            .then(
              (data: { tokens: { chainId: number; address: string }[] }) =>
                new Set(data.tokens.map((tk) => `${tk.chainId}:${tk.address.toLowerCase()}`))
            ),
          fetch("https://extendedtokens.uniswap.org/")
            .then((r) => r.json())
            .then(
              (data: { tokens: { chainId: number; address: string }[] }) =>
                new Set(data.tokens.map((tk) => `${tk.chainId}:${tk.address.toLowerCase()}`))
            ),
          remoteConfigStore.get("swaps").then((swapsConfig) => {
            const lifiTalismanTokens = swapsConfig?.lifiTalismanTokens ?? []
            return new Set(
              lifiTalismanTokens.map((tokenId: string) => {
                const [chainId, _type, contractAddress] = tokenId.split(":")
                return `${chainId}:${contractAddress}`
              })
            )
          }),
        ])
        if (cancelled) return

        setSafeTokensLoadable({
          state: "hasData",
          data: new Set([...uniswapSafe, ...uniswapExtended, ...talismanSafe]),
        })
      } catch (error) {
        if (cancelled) return
        setSafeTokensLoadable({ state: "hasError", error })
      }
    }
    run()

    return () => {
      cancelled = true
    }
  }, [])

  return safeTokensLoadable
}

/**
 * Fetches quotes from all applicable swap modules, sorts them, and derives
 * the selected quote, module, and output amount.
 */
export const useSwapQuotes = (params: {
  fromAsset: SwappableAssetWithDecimals | null
  toAsset: SwappableAssetWithDecimals | null
  fromAmount: Decimal
  fromAddress: string | null
  toAddress: string | null
  selectedProtocol: SupportedSwapProtocol | null
  selectedSubProtocol: string | undefined
  quoteSorting: "decentalised" | "cheapest" | "fastest" | "bestRate"
  quoteRefresher: number
}) => {
  const {
    fromAsset,
    toAsset,
    fromAmount,
    fromAddress,
    toAddress,
    selectedProtocol,
    selectedSubProtocol,
    quoteSorting,
  } = params

  const tokenRates = useTokenRatesMap()

  // Track per-module quotes as individual Loadable entries
  const [moduleQuotes, setModuleQuotes] = useState<
    Map<string, Loadable<BaseQuote | BaseQuote[] | null>>
  >(new Map())
  const [_allSettled, setAllSettled] = useState(false)

  // Fetch quotes from each module
  // biome-ignore lint/correctness/useExhaustiveDependencies: quoteRefresher forces re-fetch
  useEffect(() => {
    if (!fromAsset || !toAsset || !fromAmount.planck) {
      setModuleQuotes(new Map())
      setAllSettled(true)
      return
    }

    const controller = new AbortController()
    setAllSettled(false)

    const applicableModules = swapModules.filter(
      (m) => toAsset.context[m.protocol] && fromAsset.context[m.protocol]
    )

    // Initialize all as loading
    const initial = new Map<string, Loadable<BaseQuote | BaseQuote[] | null>>()
    for (const m of applicableModules) {
      initial.set(m.protocol, { state: "loading" })
    }
    setModuleQuotes(new Map(initial))

    let settledCount = 0
    const totalModules = applicableModules.length

    for (const module of applicableModules) {
      const quoteParams: QuoteParams = {
        fromAsset,
        toAsset,
        fromAmount,
        fromAddress,
        toAddress,
        selectedSubProtocol,
      }

      module
        .getQuote(quoteParams, controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return
          setModuleQuotes((prev) => {
            const next = new Map(prev)
            next.set(module.protocol, { state: "hasData", data: result })
            return next
          })
        })
        .catch((error) => {
          if (controller.signal.aborted) return
          setModuleQuotes((prev) => {
            const next = new Map(prev)
            next.set(module.protocol, { state: "hasError", error })
            return next
          })
        })
        .finally(() => {
          settledCount++
          if (settledCount >= totalModules) setAllSettled(true)
        })
    }

    if (totalModules === 0) setAllSettled(true)

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fromAsset,
    toAsset,
    fromAmount.planck,
    fromAddress,
    toAddress,
    selectedSubProtocol,
    fromAmount,
    params.quoteRefresher,
  ])

  // Build the quotes array in the same shape as the old swapQuotesAtom
  // Loadable<{ quote: Loadable<BaseQuote | null>; fees?: number }[] | null>
  const quotesLoadable: Loadable<Loadable<BaseQuote | null>[] | null> = useMemo(() => {
    if (!fromAsset || !toAsset || !fromAmount.planck) {
      return { state: "hasData", data: null }
    }

    const entries = Array.from(moduleQuotes.values())
    if (entries.length === 0) return { state: "loading" }

    // Flatten all module results into individual quote loadables
    const flatQuotes: Loadable<BaseQuote | null>[] = []
    for (const entry of entries) {
      if (entry.state === "loading") {
        flatQuotes.push({ state: "loading" })
      } else if (entry.state === "hasError") {
        flatQuotes.push({ state: "hasError", error: entry.error })
      } else if (entry.state === "hasData") {
        const data = entry.data
        if (data === null) continue
        if (Array.isArray(data)) {
          for (const q of data) {
            if (q && q.outputAmountBN > 0n) {
              flatQuotes.push({ state: "hasData", data: q })
            }
          }
        } else {
          if (data.outputAmountBN > 0n) {
            flatQuotes.push({ state: "hasData", data })
          }
        }
      }
    }

    return { state: "hasData", data: flatQuotes.length > 0 ? flatQuotes : null }
  }, [moduleQuotes, fromAsset, toAsset, fromAmount.planck])

  // Sorted quotes with fiat fee calculation
  const sortedQuotesLoadable: Loadable<
    { quote: Loadable<BaseQuote | null>; fees?: number }[] | undefined
  > = useMemo(() => {
    if (quotesLoadable.state !== "hasData") {
      if (quotesLoadable.state === "loading") return { state: "loading" } as const
      return { state: "hasError", error: (quotesLoadable as any).error } as Loadable<
        { quote: Loadable<BaseQuote | null>; fees?: number }[] | undefined
      >
    }
    if (!quotesLoadable.data) return { state: "hasData", data: undefined }

    const withFees = quotesLoadable.data.map((q) => {
      if (q.state !== "hasData" || !q.data) return { quote: q, fees: 0 }
      const fees = q.data.fees
        .reduce((acc, fee) => {
          const rate = (tokenRates as any)[fee.tokenId]?.usd?.price ?? 0
          return acc.plus(fee.amount.times(rate))
        }, BigNumber(0))
        .toNumber()
      return { quote: q, fees }
    })

    const sorted = [...withFees].sort((a, b) => {
      if (a.quote.state !== "hasData" || !a.quote.data) return 1
      if (b.quote.state !== "hasData" || !b.quote.data) return -1
      switch (quoteSorting) {
        case "bestRate":
          return +(b.quote.data.outputAmountBN - a.quote.data.outputAmountBN).toString()
        case "fastest":
          return a.quote.data.timeInSec - b.quote.data.timeInSec
        case "cheapest":
          return (a.fees ?? 0) - (b.fees ?? 0)
        case "decentalised":
          return b.quote.data.decentralisationScore - a.quote.data.decentralisationScore
        default:
          return 0
      }
    })

    return { state: "hasData", data: sorted }
  }, [quotesLoadable, tokenRates, quoteSorting])

  // Selected quote
  const selectedQuoteLoadable: Loadable<{
    quote: Loadable<BaseQuote | null>
    fees?: number
  } | null> = useMemo(() => {
    if (sortedQuotesLoadable.state !== "hasData") return sortedQuotesLoadable as any
    const quotes = sortedQuotesLoadable.data
    if (!quotes) return { state: "hasData", data: null }

    const quote =
      quotes.find(
        (q) =>
          q.quote.state === "hasData" &&
          q.quote.data &&
          q.quote.data.protocol === selectedProtocol &&
          (q.quote.data.subProtocol ? q.quote.data.subProtocol === selectedSubProtocol : true)
      ) ?? quotes[0]

    return { state: "hasData", data: quote ?? null }
  }, [sortedQuotesLoadable, selectedProtocol, selectedSubProtocol])

  // Selected swap module
  const selectedModuleLoadable: Loadable<(typeof swapModules)[number] | undefined> = useMemo(() => {
    if (selectedQuoteLoadable.state !== "hasData") return selectedQuoteLoadable as any
    const selected = selectedQuoteLoadable.data
    if (!selected) return { state: "hasData", data: undefined }

    const protocol = selected.quote.state === "hasData" ? selected.quote.data?.protocol : undefined
    if (!protocol) return { state: "hasData", data: undefined }

    return { state: "hasData", data: swapModules.find((m) => m.protocol === protocol) }
  }, [selectedQuoteLoadable])

  // To amount
  const toAmountLoadable: Loadable<Decimal | null> = useMemo(() => {
    if (selectedQuoteLoadable.state !== "hasData") return selectedQuoteLoadable as any
    const selected = selectedQuoteLoadable.data
    if (
      !selected ||
      selected.quote.state !== "hasData" ||
      selected.quote.data?.outputAmountBN === undefined ||
      !toAsset
    )
      return { state: "hasData", data: null }

    return {
      state: "hasData",
      data: Decimal.fromPlanck(selected.quote.data.outputAmountBN, toAsset.decimals, {
        currency: toAsset.symbol,
      }),
    }
  }, [selectedQuoteLoadable, toAsset])

  return {
    quotesLoadable,
    sortedQuotesLoadable,
    selectedQuoteLoadable,
    selectedModuleLoadable,
    toAmountLoadable,
  }
}

/**
 * Manages ERC20 approval state for the selected swap module.
 * Returns approval data (if approval is needed), loading state, and the prepared approval tx.
 */
export const useSwapErc20Approval = (params: {
  selectedModule: (typeof swapModules)[number] | undefined
  fromAsset: SwappableAssetWithDecimals | null
  toAsset: SwappableAssetWithDecimals | null
  fromAmount: Decimal
  fromAddress: string | null
  toAddress: string | null
  selectedSubProtocol: string | undefined
  selectedQuote: { quote: Loadable<BaseQuote | null>; fees?: number } | null
  approvalCounter: number
}) => {
  const {
    selectedModule,
    fromAsset,
    toAsset,
    fromAmount,
    fromAddress,
    toAddress,
    selectedSubProtocol,
    selectedQuote,
  } = params

  const evmNetworks = useNetworks({ platform: "ethereum" })

  // Get approval info from module (synchronous)
  const approvalInfo: ApprovalInfo = useMemo(() => {
    if (!selectedModule?.getApprovalInfo) return null
    if (!fromAsset || !toAsset) return null

    const quoteData = selectedQuote?.quote.state === "hasData" ? selectedQuote.quote.data : null
    if (!quoteData) return null

    return selectedModule.getApprovalInfo({
      fromAsset,
      toAsset,
      fromAmount,
      fromAddress,
      toAddress,
      selectedSubProtocol,
      quoteData,
    })
  }, [
    selectedModule,
    fromAsset,
    toAsset,
    fromAmount,
    fromAddress,
    toAddress,
    selectedSubProtocol,
    selectedQuote,
  ])

  // Check on-chain allowance and determine if approval is needed
  const [approvalState, setApprovalState] = useState<
    Loadable<(ApprovalInfo & { chain: ViemChain }) | null>
  >({ state: "loading" })

  // biome-ignore lint/correctness/useExhaustiveDependencies: approvalCounter forces re-check
  useEffect(() => {
    if (!approvalInfo) {
      setApprovalState({ state: "hasData", data: null })
      return
    }

    let cancelled = false
    setApprovalState({ state: "loading" })

    const run = async () => {
      try {
        const chain: ViemChain | undefined = Object.values(allEvmChains).find(
          (c) => c?.id === approvalInfo.chainId
        )
        if (!chain) {
          setApprovalState({ state: "hasData", data: null })
          return
        }

        const network = evmNetworks.find((n) => n.id.toString() === approvalInfo.chainId.toString())
        if (!network) {
          setApprovalState({ state: "hasData", data: null })
          return
        }

        const client = getExtensionPublicClient(network as any)
        if (!client) {
          setApprovalState({ state: "hasData", data: null })
          return
        }

        const allowance = await client.readContract({
          abi: erc20Abi,
          address: approvalInfo.tokenAddress as `0x${string}`,
          functionName: "allowance",
          args: [
            approvalInfo.fromAddress as `0x${string}`,
            approvalInfo.contractAddress as `0x${string}`,
          ],
        })

        if (cancelled) return

        if (allowance >= approvalInfo.amount) {
          setApprovalState({ state: "hasData", data: null })
        } else {
          setApprovalState({ state: "hasData", data: { ...approvalInfo, chain } })
        }
      } catch (error) {
        if (cancelled) return
        setApprovalState({ state: "hasError", error })
      }
    }
    run()

    return () => {
      cancelled = true
    }
  }, [approvalInfo, evmNetworks, params.approvalCounter])

  // Prepare approval tx
  const approveTxLoadable: Loadable<any> = useMemo(() => {
    if (approvalState.state !== "hasData" || !approvalState.data) {
      return { state: "hasError", error: new Error("Approval not ready yet") }
    }

    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [approvalState.data.contractAddress as `0x${string}`, approvalState.data.amount],
    })

    return {
      state: "hasData",
      data: {
        chain: approvalState.data.chain,
        to: approvalState.data.tokenAddress as `0x${string}`,
        data,
        value: 0n,
        account: fromAddress as `0x${string}`,
      },
    }
  }, [approvalState, fromAddress])

  const approvalData = useMemo(
    () => (approvalState.state === "hasData" && approvalState.data) || null,
    [approvalState]
  )

  return {
    data: approvalData,
    loading: approvalState.state === "loading",
    approveTxLoadable,
  }
}

/**
 * Initializes from-account by picking the first EVM/Substrate account from keyring.
 */
export const useFromAccount = (
  fromEvmAddress: string | null,
  setFromEvmAddress: (v: string | null) => void,
  fromSubstrateAddress: string | null,
  setFromSubstrateAddress: (v: string | null) => void
) => {
  // TODO: Support signet accounts
  const accounts = useAccounts("owned")

  const substrateAccounts = accounts.filter(isAccountAddressSs58)
  const ethAccounts = accounts.filter(isAccountAddressEthereum)

  const fromEvmAccount = useMemo(
    () => ethAccounts.find((a) => a.address.toLowerCase() === fromEvmAddress?.toLowerCase()),
    [ethAccounts, fromEvmAddress]
  )
  const fromSubstrateAccount = useMemo(
    () =>
      substrateAccounts.find(
        (a) => a.address.toLowerCase() === fromSubstrateAddress?.toLowerCase()
      ),
    [fromSubstrateAddress, substrateAccounts]
  )

  // pick first account from keyring if no account is set
  useEffect(() => {
    if (!fromEvmAccount && ethAccounts.length > 0)
      setFromEvmAddress((ethAccounts[0]?.address as `0x${string}`) ?? null)
    if (!fromSubstrateAccount && substrateAccounts.length > 0)
      setFromSubstrateAddress(substrateAccounts[0]?.address ?? null)
  }, [
    ethAccounts,
    fromEvmAccount,
    fromSubstrateAccount,
    setFromEvmAddress,
    setFromSubstrateAddress,
    substrateAccounts,
  ])

  return {
    ethAccounts,
    substrateAccounts,
    fromEvmAccount,
    fromSubstrateAccount,
    fromEvmAddress,
    fromSubstrateAddress,
  }
}

/**
 * Auto-sets the to-address when the to-asset changes.
 */
export const useSetToAddress = (
  fromAddress: string | null,
  toAsset: SwappableAssetWithDecimals | null,
  toEvmAddress: string | null,
  setToEvmAddress: (v: string | null) => void,
  toSubstrateAddress: string | null,
  setToSubstrateAddress: (v: string | null) => void,
  toBtcAddress: string | null,
  setToBtcAddress: (v: string | null) => void
) => {
  const allAccounts = useAccounts()

  const fromAccount = useMemo(
    () =>
      fromAddress
        ? allAccounts.find((account) => isAddressEqual(account.address, fromAddress))
        : null,
    [allAccounts, fromAddress]
  )
  const toNetwork = useNetworkById(String(toAsset?.chainId ?? ""))

  useEffect(() => {
    if (!toAsset) return
    switch (toAsset?.networkType) {
      case "evm":
        if (toEvmAddress && (!toNetwork || isAddressCompatibleWithNetwork(toNetwork, toEvmAddress)))
          return

        if (!isAccountPlatformEthereum(fromAccount))
          // biome-ignore lint/complexity/noCommaOperator: legacy
          return setToEvmAddress(null), setToSubstrateAddress(null), setToBtcAddress(null)

        // biome-ignore lint/complexity/noCommaOperator: legacy
        return setToEvmAddress(fromAddress), setToSubstrateAddress(null), setToBtcAddress(null)
      case "substrate":
        if (
          toSubstrateAddress &&
          (!toNetwork || isAddressCompatibleWithNetwork(toNetwork, toSubstrateAddress))
        )
          return

        if (
          !isAccountPlatformPolkadot(fromAccount) ||
          (toNetwork && !isAccountCompatibleWithNetwork(toNetwork, fromAccount))
        )
          // biome-ignore lint/complexity/noCommaOperator: legacy
          return setToEvmAddress(null), setToSubstrateAddress(null), setToBtcAddress(null)

        // biome-ignore lint/complexity/noCommaOperator: legacy
        return setToEvmAddress(null), setToSubstrateAddress(fromAddress), setToBtcAddress(null)
      case "btc":
        if (toBtcAddress) return
        // biome-ignore lint/complexity/noCommaOperator: legacy
        return setToEvmAddress(null), setToSubstrateAddress(null), setToBtcAddress(null)
      default:
        // biome-ignore lint/suspicious/noConsole: legacy
        console.error(
          `networkType ${toAsset?.networkType} not handled in updateSelectedAccountsOnAssetChange`
        )
        // biome-ignore lint/complexity/noCommaOperator: legacy
        return setToEvmAddress(null), setToSubstrateAddress(null), setToBtcAddress(null)
    }
  }, [
    fromAccount,
    fromAddress,
    setToBtcAddress,
    setToEvmAddress,
    setToSubstrateAddress,
    toAsset,
    toBtcAddress,
    toEvmAddress,
    toNetwork,
    toSubstrateAddress,
  ])
}

/**
 * Returns a callback to swap from↔to assets and amounts.
 */
export const useReverse = (
  fromAsset: SwappableAssetWithDecimals | null,
  setFromAsset: (v: SwappableAssetWithDecimals | null) => void,
  toAsset: SwappableAssetWithDecimals | null,
  setToAsset: (v: SwappableAssetWithDecimals | null) => void,
  setFromAmount: (v: Decimal) => void,
  toAmountLoadable: Loadable<Decimal | null>
) => {
  return useCallback(() => {
    if (toAmountLoadable.state === "hasData" && toAmountLoadable.data) {
      setFromAmount(toAmountLoadable.data)
    }
    setFromAsset(toAsset)
    setToAsset(fromAsset)
  }, [fromAsset, setFromAmount, setFromAsset, setToAsset, toAmountLoadable, toAsset])
}
