import type { PrimitiveAtom } from "jotai"
import type { Chain as ViemChain } from "viem/chains"
import { chainConnectorsAtom } from "@talismn/balances-react"
import { evmErc20TokenId } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import BigNumber from "bignumber.js"
import {
  isAccountAddressEthereum,
  isAccountAddressSs58,
  isAccountCompatibleWithNetwork,
  isAccountPlatformEthereum,
  isAccountPlatformPolkadot,
  isAddressCompatibleWithNetwork,
  remoteConfigStore,
} from "extension-core"
import { TFunction } from "i18next"
import { Atom, atom, Getter, useAtom, useAtomValue, useSetAtom } from "jotai"
import { atomFamily, atomWithObservable, loadable } from "jotai/utils"
import { Loadable } from "jotai/vanilla/utils/loadable"
import { useCallback, useEffect, useMemo } from "react"
import { encodeFunctionData, erc20Abi, isAddress, publicActions } from "viem"

import { lifiSwapModule } from "@ui/domains/Swap/swap-modules/lifi-swap-module"
import {
  getNetworks$,
  getTokensMap$,
  tokenRatesMap$,
  useAccounts,
  useNetworkById,
  useTokensMap,
} from "@ui/state"
import { t$ } from "@ui/state/i18n"

import type {
  BaseQuote,
  SupportedSwapProtocol,
  SwappableAssetBaseType,
} from "./swap-modules/common.swap-module"
import {
  fromAddressAtom,
  fromAmountAtom,
  fromAssetAtom,
  fromEvmAddressAtom,
  fromSubstrateAddressAtom,
  quoteSortingAtom,
  selectedProtocolAtom,
  selectedSubProtocolAtom,
  SwappableAssetWithDecimals,
  swapQuoteRefresherAtom,
  toAssetAtom,
  toBtcAddressAtom,
  toEvmAddressAtom,
  toSubstrateAddressAtom,
} from "./swap-modules/common.swap-module"
import { simpleswapSwapModule } from "./swap-modules/simpleswap-swap-module"
import { stealthexSwapModule } from "./swap-modules/stealthex-swap-module"
import { allEvmChains } from "./swaps-port/allEvmChains"
import { Decimal } from "./swaps-port/Decimal"
import { publicClientAtomFamily } from "./swaps-port/publicClientAtomFamily"
import { remoteConfigAtom } from "./swaps-port/remoteConfigAtom"

const swapModules = [simpleswapSwapModule, stealthexSwapModule, lifiSwapModule]
const ETH_LOGO =
  "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/eth.svg"
const BTC_LOGO = "https://assets.coingecko.com/coins/images/1/standard/bitcoin.png?1696501400"
const btcTokens = {
  "btc-native": {
    symbol: "BTC",
    decimals: 8,
    image: BTC_LOGO,
  },
}

const tAtom = atomWithObservable(() => t$)

const getAssetsByChainId = async (
  get: Getter,
  allAssetsSelector: Atom<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Promise<SwappableAssetBaseType<Partial<Record<SupportedSwapProtocol, any>>>[]>
  >[],
  signal: AbortSignal,
) => {
  const withRetry = async <T>(fn: () => Promise<T>, retries = 3): Promise<T | never[]> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      if (signal.aborted) return []

      try {
        return await fn()
      } catch (cause) {
        if (signal.aborted) return []

        if (attempt === retries) {
          // eslint-disable-next-line no-console
          console.warn(`assetsSelectorAtom failed ${retries} times, ignoring`, cause)
          return []
        }
        // delay before retrying
        await new Promise((resolve) => setTimeout(resolve, 100 * attempt))
      }
    }
    return []
  }

  const knownTokens = await get(atomWithObservable(() => getTokensMap$()))

  // NOTE: If one module fails to fetch tokens, retry it a few times,
  // if it still fails, move on so we can at least see the tokens from the non-failing modules
  const assets = (
    await Promise.all(
      allAssetsSelector.map((assetSelectorAtom) => {
        return withRetry(() => get(assetSelectorAtom))
      }),
    )
  ).flat()

  return assets.reduce(
    (acc, cur) => {
      const assets = acc[cur.chainId.toString()] ?? {}
      const tokenDetails = knownTokens[cur.id] ?? btcTokens[cur.id as "btc-native"]

      const symbol = tokenDetails?.symbol ?? cur.symbol
      const decimals = tokenDetails?.decimals ?? cur.decimals
      const image = symbol?.toLowerCase() === "eth" ? ETH_LOGO : cur.image
      if (!symbol || !decimals) return acc
      assets[cur.id] = {
        ...cur,
        symbol,
        decimals,
        image,
        context: {
          ...assets[cur.id]?.context,
          ...cur.context,
        },
      }
      acc[cur.chainId.toString()] = assets
      return acc
    },
    {} as Record<string, Record<string, SwappableAssetWithDecimals>>,
  )
}

const getCoingeckoCategoryTokens = async (
  get: Getter,
  categoryId: string,
  tokens: SwappableAssetWithDecimals[],
): Promise<SwappableAssetWithDecimals[]> => {
  const platforms = await get(coingeckoAssetPlatformsAtom)
  const coinsList = await get(coingeckoListAtom)
  const coins = (await get(coingeckoCoinsByCategoryAtom(categoryId))) as {
    symbol: string
    id: string
    image?: string
  }[]
  return coins
    .map((c) => {
      const coinPlatforms = Object.entries(
        coinsList.find((coin) => coin.id === c.id)?.platforms ?? {},
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
            t.contractAddress?.toLowerCase() === address.toLowerCase(),
        )
        if (token && !token.image && c.image) token.image = c.image
        return token
      })
    })
    .flat()
    .filter((c) => !!c)
}

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

export const tokenTabAtom = atom<string>("all")
export const coingeckoAssetPlatformsAtom = atom(async (get) => {
  const { apiUrl, apiKeyName, apiKeyValue } = (await get(remoteConfigAtom)).coingecko

  const response = await fetch(`${apiUrl}/api/v3/asset_platforms`, {
    headers: apiKeyName && apiKeyValue ? { [apiKeyName]: apiKeyValue } : {},
  })

  return (await response.json()) as {
    id: string
    chain_identifier: string | number | null
    name: string
    shortname: string
    native_coin_id: string
  }[]
})

export const coingeckoListAtom = atom(async (get) => {
  const { apiUrl, apiKeyName, apiKeyValue } = (await get(remoteConfigAtom)).coingecko

  const response = await fetch(`${apiUrl}/api/v3/coins/list?include_platform=true`, {
    headers: apiKeyName && apiKeyValue ? { [apiKeyName]: apiKeyValue } : {},
  })

  return (await response.json()) as { id: string; platforms: Record<string, string> }[]
})

export const coingeckoCoinsByCategoryAtom = atomFamily((category: string) =>
  atom(async (get) => {
    const { apiUrl, apiKeyName, apiKeyValue } = (await get(remoteConfigAtom)).coingecko

    const response = await fetch(
      `${apiUrl}/api/v3/coins/markets?vs_currency=usd&category=${category}&include_platform=true`,
      { headers: apiKeyName && apiKeyValue ? { [apiKeyName]: apiKeyValue } : {} },
    )

    return await response.json()
  }),
)

const uniswapSafeTokensSet = atom(async () => {
  const response = await fetch("https://tokens.uniswap.org/")
  const tokens: Array<{ chainId: number; address: string }> = (await response.json()).tokens
  return new Set(tokens.map((token) => `${token.chainId}:${token.address.toLowerCase()}`))
})

const uniswapExtendedTokensSet = atom(async () => {
  const response = await fetch("https://extendedtokens.uniswap.org/")
  const tokens: Array<{ chainId: number; address: string }> = (await response.json()).tokens
  return new Set(tokens.map((token) => `${token.chainId}:${token.address.toLowerCase()}`))
})

const talismanSafeTokensSet = atom(async (get) => {
  const lifiTalismanTokens = (await get(remoteConfigAtom)).swaps?.lifiTalismanTokens ?? []

  const safeTokens = lifiTalismanTokens.map((tokenId) => {
    const [chainId, _type, contractAddress] = tokenId.split(":")
    return `${chainId}:${contractAddress}`
  })

  return new Set(safeTokens)
})

export const safeTokensSetAtom = atom(async (get) => {
  const uniswapSafeTokens = await get(uniswapSafeTokensSet)
  const uniswapExtendedTokens = await get(uniswapExtendedTokensSet)
  const talismanSafeTokens = await get(talismanSafeTokensSet)
  return new Set([...uniswapSafeTokens, ...uniswapExtendedTokens, ...talismanSafeTokens])
})

const coingeckoCoinByAddressAtom = atomFamily((addressPlatform: string) =>
  atom(async (get) => {
    const [address, platform] = addressPlatform.split(":")
    if (!address || !platform) return null

    const { apiUrl, apiKeyName, apiKeyValue } = (await get(remoteConfigAtom)).coingecko

    const response = await fetch(`${apiUrl}/api/v3/coins/${platform}/contract/${address}`, {
      headers: apiKeyName && apiKeyValue ? { [apiKeyName]: apiKeyValue } : {},
    })

    return (await response.json()) as {
      image?: {
        large: string
        small: string
        thumb: string
      }
    }
  }),
)

export const swapFromSearchAtom = atom<string>("")
export const swapToSearchAtom = atom<string>("")

const erc20Atom = atomFamily((addressChainId: string) =>
  atom(async (get): Promise<SwappableAssetWithDecimals | null> => {
    const [address, chainIdString] = addressChainId.split(":")
    if (!address || !chainIdString) return null
    const chainId = +chainIdString
    const isValidAddress = isAddress(address)
    if (!isValidAddress || isNaN(chainId)) return null

    const chain: ViemChain | undefined = Object.values(allEvmChains).find((c) => c?.id === chainId)
    if (!chain) return null
    const evmNetworks = await get(atomWithObservable(() => getNetworks$({ platform: "ethereum" })))
    const network = evmNetworks.find((network) => network.id.toString() === chainId.toString())
    if (!network) return null
    const platforms = await get(coingeckoAssetPlatformsAtom)
    const platform = platforms.find((p) => p.chain_identifier === chainId)
    if (!platform) return null

    const client = await get(publicClientAtomFamily(network.id))
    if (!client) return null

    const [symbolData, decimalsData, namedata] = await client.multicall({
      contracts: [
        {
          abi: erc20Abi,
          address,
          functionName: "symbol",
        },
        {
          abi: erc20Abi,
          address,
          functionName: "decimals",
        },
        {
          abi: erc20Abi,
          address,
          functionName: "name",
        },
      ],
    })

    const symbol = symbolData.status === "success" ? symbolData.result : null
    const decimals = decimalsData.status === "success" ? decimalsData.result : null
    const name = namedata.status === "success" ? namedata.result : null
    if (!symbol || !decimals || !name) return null

    const coingeckoData = await get(coingeckoCoinByAddressAtom(`${address}:${platform.id}`))
    const id = evmErc20TokenId(chainIdString, address)

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
  }),
)

const filterAndSortTokens = async (
  get: Getter,
  tokens: SwappableAssetWithDecimals[],
  search: string,
): Promise<SwappableAssetWithDecimals[]> => {
  if (search.trim().length > 0) {
    const isSearchingAddress = isAddress(search)
    const searchLoweredCase = search.toLowerCase()
    const knownFilteredTokens = tokens.filter(
      (t) =>
        t.symbol.toLowerCase().startsWith(searchLoweredCase) ||
        t.name.toLowerCase().startsWith(searchLoweredCase) ||
        (isSearchingAddress && t.contractAddress?.startsWith(searchLoweredCase)),
    )

    if (isSearchingAddress && knownFilteredTokens.length === 0) {
      // find token details from on chain
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
          .map((chain: ViemChain) => get(erc20Atom(`${search}:${chain?.id}`))),
      )
      return allOnChainTokens.filter((t) => t !== null)
    }
    const safeTokens = await get(safeTokensSetAtom)
    return knownFilteredTokens.sort((a, b) => {
      // prioritize native tokens
      if (a.id.includes("native") && !b.id.includes("native")) return -1
      if (b.id.includes("native") && !a.id.includes("native")) return 1

      // prioritize tokens in safe tokens list
      const aSafe = safeTokens.has(`${a.chainId}:${a.contractAddress?.toLowerCase()}`)
      const bSafe = safeTokens.has(`${a.chainId}:${a.contractAddress?.toLowerCase()}`)
      if (aSafe && !bSafe) return -1
      if (bSafe && !aSafe) return 1

      // prioritize tokens with exact symbol match
      const aSymbol = a.symbol.toLowerCase()
      const bSymbol = b.symbol.toLowerCase()
      if (aSymbol === searchLoweredCase && bSymbol !== searchLoweredCase) return -1
      if (bSymbol === searchLoweredCase && aSymbol !== searchLoweredCase) return 1
      // if both are same symbol and both match search, sort by chain id
      if (aSymbol === searchLoweredCase && bSymbol === searchLoweredCase)
        return +a.chainId - +b.chainId

      // then prioritize tokens with exact start of symbol match
      if (aSymbol.startsWith(searchLoweredCase) && !bSymbol.startsWith(searchLoweredCase)) return -1
      if (bSymbol.startsWith(searchLoweredCase) && !aSymbol.startsWith(searchLoweredCase)) return 1
      // if both have matching start, sort by chain id
      if (aSymbol.startsWith(searchLoweredCase) && bSymbol.startsWith(searchLoweredCase))
        return +a.chainId - +b.chainId

      return a.symbol.localeCompare(b.symbol)
    })
  }

  const { curatedTokens = [] } = await remoteConfigStore.get("swaps")

  const t = await get(tAtom)
  const tab = get(tokenTabAtom)
  const tokenTabs = getTokenTabs({ t, curatedTokens })
  const filter = tokenTabs.find((t) => t.value === tab)?.filter
  const sort = tokenTabs.find((t) => t.value === tab)?.sort
  const coingeckoCategoryId = tokenTabs.find((t) => t.value === tab && t.coingecko)?.value

  let filteredSortedTokens = [...tokens]
  if (filter) filteredSortedTokens = filteredSortedTokens.filter(filter)
  if (sort) filteredSortedTokens = filteredSortedTokens.sort(sort)
  if (coingeckoCategoryId)
    filteredSortedTokens = await getCoingeckoCategoryTokens(
      get,
      coingeckoCategoryId,
      filteredSortedTokens,
    )

  return filteredSortedTokens
}

/**
 * Unify all tokens we support for swapping on the UI
 * Note that this list is just to get the tokens we display initially on the UI
 * Users should later be able to paste any arbitrary address to swap any token
 * This will happen when we support other protocols like uniswap, sushiswap, etc
 */
export const fromAssetsAtom = atom(async (get, { signal }) => {
  const allAssetsSelector = swapModules.map((module) => module.fromAssetsSelector)
  const assetsByChains = await getAssetsByChainId(get, allAssetsSelector, signal)
  const search = get(swapFromSearchAtom)

  const tokens = Object.values(assetsByChains)
    .map((tokens) =>
      Object.values(tokens).sort((a, b) =>
        a.symbol.replaceAll("$", "").localeCompare(b.symbol.replaceAll("$", "")),
      ),
    )
    .flat()

  const filteredTokens = await filterAndSortTokens(get, tokens, search)
  // from assets should not include btc
  return filteredTokens.filter((t) => t.networkType !== "btc")
})

export const toAssetsAtom = atom(async (get, { signal }) => {
  const fromAsset = get(fromAssetAtom)
  const search = get(swapToSearchAtom)

  // only select from the protocols that fromAsset support
  const allAssetsSelector = swapModules
    .filter((m) => (fromAsset ? fromAsset.context[m.protocol] : true))
    .map((module) => module.toAssetsSelector)

  const assetsByChains = await getAssetsByChainId(get, allAssetsSelector, signal)
  const tokens = Object.values(assetsByChains)
    .map((tokens) =>
      Object.values(tokens).sort((a, b) =>
        a.symbol.replaceAll("$", "").localeCompare(b.symbol.replaceAll("$", "")),
      ),
    )
    .flat()

  return await filterAndSortTokens(get, tokens, search)
})

export const swapQuotesAtom = loadable(
  atom(async (get): Promise<Loadable<Promise<BaseQuote | null>>[] | null> => {
    const fromAsset = get(fromAssetAtom)
    const toAsset = get(toAssetAtom)
    const allQuoters = swapModules
      .filter((m) =>
        fromAsset && toAsset ? toAsset.context[m.protocol] && fromAsset.context[m.protocol] : true,
      )
      .map((module) => module.quote)
    const fromAmount = get(fromAmountAtom)
    // const substrateApiGetter = get(substrateApiGetterAtom)

    // force refresh
    get(swapQuoteRefresherAtom)

    // nothing to quote
    if (!fromAsset || !toAsset || !fromAmount.planck /* || !substrateApiGetter */) return null

    const allQuotes = allQuoters
      .map(get)
      .map((q) => (q.state === "hasData" ? (Array.isArray(q.data) ? q.data.flat() : q) : q))
      .flat()

    // map each, if loaded, return only if output > 0
    return allQuotes.filter((q) => {
      if (q.state !== "hasData") return true
      if (!q.data || Array.isArray(q.data)) return false
      return q.data.outputAmountBN > 0n
    }) as Loadable<Promise<BaseQuote | null>>[] | null
  }),
)

export const sortedQuotesAtom = atom(async (get) => {
  const quotes = get(swapQuotesAtom)
  const sort = get(quoteSortingAtom)
  const tokenRates = await get(atomWithObservable(() => tokenRatesMap$))

  if (quotes.state === "hasError") throw quotes.error
  if (quotes.state !== "hasData") return undefined
  return quotes.data
    ?.map((q) => {
      if (q.state !== "hasData") return { quote: q, fees: 0 }
      const fees = q.data?.fees
        .reduce((acc, fee) => {
          const rate = tokenRates[fee.tokenId]?.usd?.price ?? 0
          return acc.plus(fee.amount.times(rate))
        }, BigNumber(0))
        ?.toNumber()
      return {
        quote: q,
        fees,
      }
    })
    .sort((a, b) => {
      // all loading quotes should be at the end
      if (a.quote.state !== "hasData" || !a.quote.data) return 1
      if (b.quote.state !== "hasData" || !b.quote.data) return -1
      switch (sort) {
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
})

export const selectedQuoteAtom = atom(async (get) => {
  const quotes = await get(sortedQuotesAtom)
  const selectedProtocol = get(selectedProtocolAtom)
  const subProtocol = get(selectedSubProtocolAtom)
  if (!quotes) return null

  const quote =
    quotes.find(
      (q) =>
        q.quote.state === "hasData" &&
        q.quote.data &&
        q.quote.data.protocol === selectedProtocol &&
        (q.quote.data.subProtocol ? q.quote.data.subProtocol === subProtocol : true),
    ) ?? quotes[0]
  if (!quote) return null

  return quote
})

export const selectedSwapModuleAtom = atom(async (get) => {
  const selectedQuote = await get(selectedQuoteAtom)
  if (!selectedQuote) return

  const selectedProtocol =
    selectedQuote.quote.state === "hasData" ? selectedQuote.quote.data?.protocol : undefined
  if (!selectedProtocol) return

  return swapModules.find((module) => module.protocol === selectedProtocol)
})

export const approvalCounterAtom = atom(0)
export const approvalAtom = atom(async (get) => {
  const module = await get(selectedSwapModuleAtom)

  if (!module?.approvalAtom) return null

  const approval = get(module.approvalAtom)
  if (!approval) return null

  const chain: ViemChain | undefined = Object.values(allEvmChains).find(
    (c) => c?.id === approval.chainId,
  )
  // chain unsupported
  if (!chain) return null

  const evmNetworks = await get(atomWithObservable(() => getNetworks$({ platform: "ethereum" })))
  const network = evmNetworks.find(
    (network) => network.id.toString() === approval.chainId.toString(),
  )
  if (!network) return null

  // trigger approval check when updated
  get(approvalCounterAtom)

  const client = await get(publicClientAtomFamily(network.id))
  if (!client) return null
  const allowance = await client.readContract({
    abi: erc20Abi,
    address: approval.tokenAddress as `0x${string}`,
    functionName: "allowance",
    args: [approval.fromAddress as `0x${string}`, approval.contractAddress as `0x${string}`],
  })

  if (allowance >= approval.amount) return null
  return { ...approval, chain }
})

export const toAmountAtom = atom(async (get) => {
  const quote = await get(selectedQuoteAtom)
  if (!quote) return null

  const toAsset = get(toAssetAtom)
  if (
    !quote ||
    quote.quote.state !== "hasData" ||
    quote.quote.data?.outputAmountBN === undefined ||
    !toAsset
  )
    return null
  return Decimal.fromPlanck(quote.quote.data.outputAmountBN, toAsset.decimals, {
    currency: toAsset.symbol,
  })
})

// utility hooks

export const useReverse = () => {
  const setFromAmount = useSetAtom(fromAmountAtom)

  const [fromAsset, setFromAsset] = useAtom(fromAssetAtom)
  const [toAsset, setToAsset] = useAtom(toAssetAtom)

  const toAmount = useAtomValue(loadable(toAmountAtom))

  return useCallback(() => {
    if (toAmount.state === "hasData" && toAmount.data) {
      setFromAmount(toAmount.data)
    }
    setFromAsset(toAsset)
    setToAsset(fromAsset)
  }, [fromAsset, setFromAmount, setFromAsset, setToAsset, toAmount, toAsset])
}

export const useAssetToken = (assetAtom: PrimitiveAtom<SwappableAssetBaseType | null>) => {
  const asset = useAtomValue(assetAtom)
  const tokens = useTokensMap()

  return useMemo(() => {
    if (!asset) return null
    const token = tokens[asset.id]
    if (!token) return null
    return {
      ...token,
      isEvm:
        token.type === "evm-erc20" || token.type === "evm-native" || token.type === "evm-uniswapv2",
    }
  }, [asset, tokens])
}

export const useFromAccount = () => {
  // TODO: Support signet accounts
  const accounts = useAccounts("owned")

  const substrateAccounts = accounts.filter(isAccountAddressSs58)
  const ethAccounts = accounts.filter(isAccountAddressEthereum)

  const [fromEvmAddress, setFromEvmAddress] = useAtom(fromEvmAddressAtom)
  const [fromSubstrateAddress, setFromSubstrateAddress] = useAtom(fromSubstrateAddressAtom)

  const fromEvmAccount = useMemo(
    () => ethAccounts.find((a) => a.address.toLowerCase() === fromEvmAddress?.toLowerCase()),
    [ethAccounts, fromEvmAddress],
  )
  const fromSubstrateAccount = useMemo(
    () =>
      substrateAccounts.find(
        (a) => a.address.toLowerCase() === fromSubstrateAddress?.toLowerCase(),
      ),
    [fromSubstrateAddress, substrateAccounts],
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

export const useSetToAddress = () => {
  const allAccounts = useAccounts()
  const fromAddress = useAtomValue(fromAddressAtom)
  const toAsset = useAtomValue(toAssetAtom)

  const [toEvmAddress, setToEvmAddress] = useAtom(toEvmAddressAtom)
  const [toSubstrateAddress, setToSubstrateAddress] = useAtom(toSubstrateAddressAtom)
  const [toBtcAddress, setToBtcAddress] = useAtom(toBtcAddressAtom)

  const fromAccount = useMemo(
    () =>
      fromAddress
        ? allAccounts.find((account) => isAddressEqual(account.address, fromAddress))
        : null,
    [allAccounts, fromAddress],
  )
  const toNetwork = useNetworkById(String(toAsset?.chainId ?? ""))

  useEffect(() => {
    if (!toAsset) return
    // when fromAddress, fromAsset or toAsset changes, set toAddress to either fromAddress or null, depending on whether it's compatible with the new toAsset
    switch (toAsset?.networkType) {
      case "evm":
        // toAddress is already evm, don't change anything (if it's still compatible with this network)
        if (
          toEvmAddress &&
          // check that toEvmAddress is compatible with the new toAsset network
          (!toNetwork || isAddressCompatibleWithNetwork(toNetwork, toEvmAddress))
        )
          return

        // fromAddress isn't evm, set toAddress to null
        if (!isAccountPlatformEthereum(fromAccount))
          return setToEvmAddress(null), setToSubstrateAddress(null), setToBtcAddress(null)

        // fromAddress is evm, set toAddress to fromAddress
        return setToEvmAddress(fromAddress), setToSubstrateAddress(null), setToBtcAddress(null)
      case "substrate":
        // toAddress is already substrate, don't change anything (if it's still compatible with this network)
        if (
          toSubstrateAddress &&
          // check that toSubstrateAddress is compatible with the new toAsset network
          (!toNetwork || isAddressCompatibleWithNetwork(toNetwork, toSubstrateAddress))
        )
          return

        // fromAddress isn't substrate, set toAddress to null
        if (
          !isAccountPlatformPolkadot(fromAccount) ||
          (toNetwork && !isAccountCompatibleWithNetwork(toNetwork, fromAccount))
        )
          return setToEvmAddress(null), setToSubstrateAddress(null), setToBtcAddress(null)

        // fromAddress is substrate, set toAddress to fromAddress
        return setToEvmAddress(null), setToSubstrateAddress(fromAddress), setToBtcAddress(null)
      case "btc":
        // toAddress is already btc, don't change anything
        if (toBtcAddress) return

        // fromAddress is never btc, always set toAddress to null
        return setToEvmAddress(null), setToSubstrateAddress(null), setToBtcAddress(null)
      default:
        // eslint-disable-next-line no-console
        console.error(
          `networkType ${toAsset?.networkType} not handled in updateSelectedAccountsOnAssetChange`,
        )
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

export const categoriesAtom = atom(async (get) => {
  const { apiUrl, apiKeyName, apiKeyValue } = (await get(remoteConfigAtom)).coingecko

  const response = await fetch(`${apiUrl}/api/v3//coins/markets?vs_currency=usd&category=wallets`, {
    headers: apiKeyName && apiKeyValue ? { [apiKeyName]: apiKeyValue } : {},
  })

  return await response.json()
})

// NOTE: only used by lifi
export const useSwapErc20Approval = () => {
  const approval = useAtomValue(loadable(approvalAtom))
  const approvalData = useMemo(
    () => (approval.state === "hasData" && approval.data) || null,
    [approval],
  )
  const approveTxLoadable = useAtomValue(loadable(erc20ApprovalTxAtom))

  return {
    data: approvalData,
    loading: approval.state === "loading",
    approveTxLoadable,
  }
}

const erc20ApprovalTxAtom = atom(async (get) => {
  const approval = get(loadable(approvalAtom))
  const approvalData = approval.state === "hasData" && approval.data
  if (!approvalData) throw new Error("Approval not ready yet")

  const evmChainConnector = get(chainConnectorsAtom).evm
  if (!evmChainConnector) throw new Error("Missing evm chain connector")

  const fromAddress = get(fromAddressAtom)
  if (!fromAddress) throw new Error("Missing from address")

  const fromAsset = get(fromAssetAtom)
  if (fromAsset?.networkType !== "evm") throw new Error("Approval not supported for this asset")

  const walletClient = (
    await evmChainConnector.getWalletClientForEvmNetwork(fromAsset.chainId.toString())
  )?.extend(publicActions)
  if (!walletClient) throw new Error("Missing evm client")

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "approve",
    args: [approvalData.contractAddress as `0x${string}`, approvalData.amount],
  })

  return walletClient.prepareTransactionRequest({
    chain: approvalData.chain,
    to: approvalData.tokenAddress as `0x${string}`,
    data,
    value: 0n,
    account: fromAddress as `0x${string}`,
  })
})
