import type { PrimitiveAtom } from "jotai"
import { evmErc20TokenId } from "@talismn/balances"
import { isAccountAddressEthereum, isAccountAddressSs58, remoteConfigStore } from "extension-core"
import { Atom, atom, Getter, useAtom, useAtomValue, useSetAtom } from "jotai"
import { atomFamily, atomWithObservable, loadable } from "jotai/utils"
import { Loadable } from "jotai/vanilla/utils/loadable"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { erc20Abi, isAddress } from "viem"
import * as allEvmChains from "viem/chains"
import { type Chain as ViemChain } from "viem/chains"

import {
  getEvmNetworks$,
  getTokensMap$,
  tokenRatesMap$,
  useAccounts,
  useTokensMap,
} from "@ui/state"

import type {
  BaseQuote,
  SupportedSwapProtocol,
  SwappableAssetBaseType,
} from "./swap-modules/common.swap-module"
import {
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
  toEvmAddressAtom,
  toSubstrateAddressAtom,
} from "./swap-modules/common.swap-module"
import { simpleswapSwapModule } from "./swap-modules/simpleswap-swap-module"
import { stealthexSwapModule } from "./swap-modules/stealthex-swap-module"
import { Decimal } from "./swaps-port/Decimal"
import { publicClientAtomFamily } from "./swaps-port/publicClientAtomFamily"
import { remoteConfigAtom } from "./swaps-port/remoteConfigAtom"

const swapModules = [simpleswapSwapModule, stealthexSwapModule]
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

const getTokensByChainId = async (
  get: Getter,
  allTokensSelector: Atom<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Promise<SwappableAssetBaseType<Partial<Record<SupportedSwapProtocol, any>>>[]>
  >[],
) => {
  const knownTokens = await get(atomWithObservable(() => getTokensMap$()))
  const tokens = (await Promise.all(allTokensSelector.map(get))).flat()
  return tokens.reduce(
    (acc, cur) => {
      const tokens = acc[cur.chainId.toString()] ?? {}
      const tokenDetails = knownTokens[cur.id] ?? btcTokens[cur.id as "btc-native"]

      const symbol = tokenDetails?.symbol ?? cur.symbol
      const decimals = tokenDetails?.decimals ?? cur.decimals
      const image = symbol?.toLowerCase() === "eth" ? ETH_LOGO : cur.image
      if (!symbol || !decimals) return acc
      tokens[cur.id] = {
        ...cur,
        symbol,
        decimals,
        image,
        context: {
          ...tokens[cur.id]?.context,
          ...cur.context,
        },
      }
      acc[cur.chainId.toString()] = tokens
      return acc
    },
    {} as Record<string, Record<string, SwappableAssetWithDecimals>>,
  )
}

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

export const coingeckoCategoriesAtom = atom(async (get) => {
  const { apiUrl, apiKeyName, apiKeyValue } = (await get(remoteConfigAtom)).coingecko

  const response = await fetch(`${apiUrl}/api/v3/coins/categories`, {
    headers: apiKeyName && apiKeyValue ? { [apiKeyName]: apiKeyValue } : {},
  })

  return await response.json()
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

export const uniswapSafeTokensList = atom(async () => {
  const response = await fetch("https://tokens.uniswap.org/")
  return (await response.json()).tokens as { chainId: number; address: string }[]
})

export const uniswapExtendedTokensList = atom(async () => {
  const response = await fetch("https://extendedtokens.uniswap.org/")
  return (await response.json()).tokens as { chainId: number; address: string }[]
})

export const safeTokensListAtom = atom(async (get) => {
  const uniswapSafeTokens = await get(uniswapSafeTokensList)
  const uniswapExtendedTokens = await get(uniswapExtendedTokensList)
  return [...uniswapSafeTokens, ...uniswapExtendedTokens]
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

    const chain: ViemChain | undefined = Object.values(allEvmChains).find((c) => c.id === chainId)
    if (!chain) return null
    const evmNetworks = await get(atomWithObservable(() => getEvmNetworks$()))
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
    const id = evmErc20TokenId(address, chainIdString)

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
        ].map((chain: ViemChain) => get(erc20Atom(`${search}:${chain.id}`))),
      )
      return allOnChainTokens.filter((t) => t !== null)
    }
    const safeTokens = await get(safeTokensListAtom)
    return knownFilteredTokens.sort((a, b) => {
      // prioritize native tokens
      if (a.id.includes("native") && !b.id.includes("native")) return -1
      if (b.id.includes("native") && !a.id.includes("native")) return 1

      // prioritize tokens in safe tokens list
      const aSafe = safeTokens.some(
        (t) => t.address.toLowerCase() === a.contractAddress?.toLowerCase(),
      )
      const bSafe = safeTokens.some(
        (t) => t.address.toLowerCase() === b.contractAddress?.toLowerCase(),
      )
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
  const filter = (token: SwappableAssetWithDecimals): boolean =>
    curatedTokens.includes(token.id) ?? false
  const sort = (a: SwappableAssetWithDecimals, b: SwappableAssetWithDecimals): number =>
    curatedTokens.indexOf(a.id) - curatedTokens.indexOf(b.id)

  return tokens.filter(filter).sort(sort)
}

/**
 * Unify all tokens we support for swapping on the UI
 * Note that this list is just to get the tokens we display initially on the UI
 * Users should later be able to paste any arbitrary address to swap any token
 * This will happen when we support other protocols like uniswap, sushiswap, etc
 */
export const fromAssetsAtom = atom(async (get) => {
  const allTokensSelector = swapModules.map((module) => module.fromAssetsSelector)
  const tokensByChains = await getTokensByChainId(get, allTokensSelector)
  const search = get(swapFromSearchAtom)

  const tokens = Object.values(tokensByChains)
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

export const toAssetsAtom = atom(async (get) => {
  const fromAsset = get(fromAssetAtom)
  const search = get(swapToSearchAtom)

  // only select from the protocols that fromAsset support
  const allTokensSelector = swapModules
    .filter((m) => (fromAsset ? fromAsset.context[m.protocol] : true))
    .map((module) => module.toAssetsSelector)

  const tokensByChains = await getTokensByChainId(get, allTokensSelector)
  const tokens = Object.values(tokensByChains)
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
      const fees = q.data?.fees.reduce((acc, fee) => {
        const rate = tokenRates[fee.tokenId]?.usd?.price ?? 0
        return acc + fee.amount.toNumber() * rate
      }, 0)
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

const approvalCounterAtom = atom(0)
export const approvalAtom = atom(async (get) => {
  const protocol = get(selectedProtocolAtom)
  const quotes = await get(sortedQuotesAtom)

  const defaultQuote = quotes?.[0]
  const selectedProtocol =
    protocol ?? (defaultQuote?.quote.state === "hasData" ? defaultQuote.quote.data?.protocol : null)
  const module = swapModules.find((module) => module.protocol === selectedProtocol)

  if (!module?.approvalAtom || !selectedProtocol) return null

  const approval = get(module.approvalAtom)
  if (!approval) return null

  const chain: ViemChain | undefined = Object.values(allEvmChains).find(
    (c) => c.id === approval.chainId,
  )
  // chain unsupported
  if (!chain) return null

  const evmNetworks = await get(atomWithObservable(() => getEvmNetworks$()))
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

export const useToAccount = () => {
  const initiated = useRef(false)

  const accounts = useAccounts("all")

  const substrateAccounts = accounts.filter(isAccountAddressSs58)
  const ethAccounts = accounts.filter(isAccountAddressEthereum)

  const [toEvmAddress, setToEvmAddress] = useAtom(toEvmAddressAtom)
  const [toSubstrateAddress, setToSubstrateAddress] = useAtom(toSubstrateAddressAtom)

  const toEvmAccount = useMemo(
    () => ethAccounts.find((a) => a.address.toLowerCase() === toEvmAddress?.toLowerCase()),
    [ethAccounts, toEvmAddress],
  )
  const toSubstrateAccount = useMemo(
    () =>
      substrateAccounts.find((a) => a.address.toLowerCase() === toSubstrateAddress?.toLowerCase()),
    [substrateAccounts, toSubstrateAddress],
  )

  useEffect(() => {
    if (initiated.current) return
    if (!toEvmAccount && ethAccounts.length > 0)
      setToEvmAddress((ethAccounts[0]?.address as `0x${string}`) ?? null)
    if (!toSubstrateAccount && substrateAccounts.length > 0)
      setToSubstrateAddress(substrateAccounts[0]?.address ?? null)
  }, [
    ethAccounts,
    setToEvmAddress,
    setToSubstrateAddress,
    substrateAccounts,
    toEvmAccount,
    toSubstrateAccount,
  ])

  useEffect(() => {
    if (toEvmAddress && toSubstrateAddress) initiated.current = true
  }, [toEvmAddress, toSubstrateAddress])
}

export const categoriesAtom = atom(async (get) => {
  const { apiUrl, apiKeyName, apiKeyValue } = (await get(remoteConfigAtom)).coingecko

  const response = await fetch(`${apiUrl}/api/v3//coins/markets?vs_currency=usd&category=wallets`, {
    headers: apiKeyName && apiKeyValue ? { [apiKeyName]: apiKeyValue } : {},
  })

  return await response.json()
})

export const useSwapErc20Approval = () => {
  const approval = useAtomValue(loadable(approvalAtom))
  const [approving] = useState(false)

  const approvalData = useMemo(() => {
    if (approval.state !== "hasData" || !approval.data) return null
    return approval.data
  }, [approval])

  const approve = useCallback(async () => {
    // Not needed for simpleswap, only for lifi
    throw new Error("Erc20 approval not implemented")
  }, [])

  return { data: approvalData, approve, approving, loading: approval.state === "loading" }
}
