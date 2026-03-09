import { UNKNOWN_TOKEN_URL } from "@common/constants"
import { MultiAddress } from "@polkadot-api/descriptors"
import { evmNativeTokenId, subAssetTokenId, subNativeTokenId } from "@talismn/balances-react"
import type { EthNetworkId } from "@talismn/chaindata-provider"
import { encodeAnyAddress, isAddressEqual, isEthereumAddress } from "@talismn/crypto"
import { planckToTokens } from "@talismn/util"
import { getExtensionPublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { accounts$ } from "@ui/state/accounts"
import {
  getNetworkById$,
  getNetworks$,
  getNetworksMapById$,
  getToken$,
  getTokensMap$,
} from "@ui/state/chaindata"
import BigNumber from "bignumber.js"
import createClient from "openapi-fetch"
import {
  catchError,
  defer,
  firstValueFrom,
  interval,
  type Observable,
  of,
  retry,
  startWith,
  switchMap,
  takeWhile,
} from "rxjs"
import { encodeFunctionData, erc20Abi, type TransactionRequest } from "viem"
import { parseUserInputToPlanck } from "../swap-utils"
import {
  type BaseQuote,
  type EvmTxParams,
  type ExchangeParams,
  getTokenIdForSwappableAsset,
  type QuoteFee,
  type QuoteParams,
  type SubstrateTxParams,
  type SupportedSwapProtocol,
  type SwapModule,
  type SwappableAssetBaseType,
  type SwappableAssetWithDecimals,
  validateAddress,
} from "./common.swap-module"
import type {
  paths as StealthexApi,
  SchemaCurrency as StealthexCurrency,
  SchemaExchange as StealthexExchange,
} from "./stealthex.api.d.ts"
import stealthexLogo from "./stealthex-logo.svg?url"

const apiUrl = "https://stealthex.talisman.xyz"
const PROTOCOL: SupportedSwapProtocol = "stealthex" as const
const PROTOCOL_NAME = "StealthEX"
const DECENTRALISATION_SCORE = 1.5
type FeeProps = { fromAsset: SwappableAssetBaseType; toAsset: SwappableAssetBaseType }
const getTalismanTotalFee = ({ fromAsset, toAsset }: FeeProps) => {
  const isSubToOrFromEvm =
    (fromAsset.networkType === "substrate" && toAsset.networkType === "evm") ||
    (fromAsset.networkType === "evm" && toAsset.networkType === "substrate")

  const isSubToOrFromSub =
    (fromAsset.networkType === "substrate" && toAsset.networkType === "substrate") ||
    (fromAsset.networkType === "substrate" && toAsset.networkType === "substrate")

  const isEvmToOrFromEvm =
    (fromAsset.networkType === "evm" && toAsset.networkType === "evm") ||
    (fromAsset.networkType === "evm" && toAsset.networkType === "evm")

  const isToOrFromBtc = fromAsset.networkType === "btc" || toAsset.networkType === "btc"

  if (isSubToOrFromEvm) return 0.006 // 0.6% total fee for sub<>evm
  if (isSubToOrFromSub) return 0.005 // 0.5% total fee for sub<>sub
  if (isEvmToOrFromEvm) return 0.002 // 0.2% total fee for evm<>evm (NOTE: will actually be 0.4%, as that is the minimum we can set via stealthex for now)
  if (isToOrFromBtc) return 0.015 // 1.5% total fee for any<>btc
  return 0.01 // 1.0% total fee by default
}
const BUILT_IN_FEE = 0.004 // StealthEX always includes an affiliate fee of 0.4%
const getAdditionalFee = (feeProps: FeeProps) =>
  Math.max(
    // we want a total fee of x,
    // so get the total talisman fee for this route,
    // then subtract the built-in fee of 0.4%, which is applied to all exchanges made via stealthex
    getTalismanTotalFee(feeProps) - BUILT_IN_FEE,
    // if the talisman total fee is less than the built-in fee, default to an additional_fee of 0.0
    0
  )
// Our UI represents a 1% fee as `0.01`, but the StealthEX api represents a 1% fee as `1.0`.
// 1.0 = 0.01 * 100
const decimalToPercent = (decimal: number) => Math.round(decimal * 100 * 100) / 100
const getAdditionalFeePercent = (feeProps: FeeProps) => decimalToPercent(getAdditionalFee(feeProps)) // to percent

const LOGO = stealthexLogo

type AssetContext = {
  network: string
  symbol: string
}

const supportedEvmNetworkIds: Record<string, EthNetworkId | undefined> = {
  arbitrum: "42161",
  arbnova: "42170",
  base: "8453",
  bsc: "56",
  eth: "1",
  glmr: "1284",
  manta: "169",
  matic: "137",
  opbnb: "204",
  optimism: "10",
  theta: "361",
  vana: "1480",
  zksync: "324",
}

/**
 * specialAssets list defines a mappings of assets from stealthex to our internal asset representation.
 * Many assets on stealthex are not tradeable in an onchain context because they dont come with contract addresses.
 * To avoid displaying a token which we dont have contract address for (which could result in a bunch of issues like, not being able to display the token balance, not being able to transfer the token for swapping and etc),
 * We support mainly 2 types of assets:
 * - ERC20 tokens: we only support ERC20 tokens from stealthex that comes with contract addresses
 * - Special assets: all substrate and evm native assets from stealthex are whitelisted as special assets
 */
const specialAssets: Record<string, Omit<SwappableAssetBaseType, "context">> = {
  "mainnet::dot": {
    id: subNativeTokenId("polkadot-asset-hub"),
    name: "Polkadot Asset Hub",
    symbol: "DOT",
    chainId: "polkadot-asset-hub",
    networkType: "substrate",
  },
  "polkadot::ksm": {
    id: subNativeTokenId("kusama-asset-hub"),
    name: "Kusama Asset Hub",
    symbol: "KSM",
    chainId: "kusama-asset-hub",
    networkType: "substrate",
  },
  "polkadot::usdt": {
    id: subAssetTokenId("polkadot-asset-hub", "1984"),
    name: "USDT (Polkadot)",
    chainId: "polkadot-asset-hub",
    symbol: "USDT",
    networkType: "substrate",
    assetHubAssetId: "1984",
  },
  "polkadot::usdc": {
    id: subAssetTokenId("polkadot-asset-hub", "1337"),
    name: "USDC (Polkadot)",
    chainId: "polkadot-asset-hub",
    symbol: "USDC",
    networkType: "substrate",
    assetHubAssetId: "1337",
  },
  "mainnet::eth": {
    id: evmNativeTokenId("1"),
    name: "Ethereum",
    chainId: 1,
    symbol: "ETH",
    networkType: "evm",
  },
  "arbitrum::eth": {
    id: evmNativeTokenId("42161"),
    name: "Ethereum",
    chainId: 42161,
    symbol: "ETH",
    networkType: "evm",
  },
  "arbnova::eth": {
    id: evmNativeTokenId("42170"),
    name: "Ethereum",
    chainId: 42170,
    symbol: "ETH",
    networkType: "evm",
  },
  "base::eth": {
    id: evmNativeTokenId("8453"),
    name: "Ethereum",
    chainId: 8453,
    symbol: "ETH",
    networkType: "evm",
  },
  "bsc::eth": {
    id: evmNativeTokenId("56"),
    name: "Ethereum",
    chainId: 56,
    symbol: "ETH",
    networkType: "evm",
  },
  "optimism::eth": {
    id: evmNativeTokenId("10"),
    name: "Ethereum",
    chainId: 10,
    symbol: "ETH",
    networkType: "evm",
  },
  "mainnet::vana": {
    id: evmNativeTokenId("1480"),
    name: "Vana",
    chainId: 1480,
    symbol: "VANA",
    networkType: "evm",
  },
  "manta::eth": {
    id: evmNativeTokenId("169"),
    name: "Ethereum (Manta Pacific)",
    chainId: 169,
    symbol: "ETH",
    networkType: "evm",
  },
  "zksync::eth": {
    id: evmNativeTokenId("324"),
    name: "Ethereum",
    chainId: 324,
    symbol: "ETH",
    networkType: "evm",
  },
  "mainnet::tao": {
    id: subNativeTokenId("bittensor"),
    name: "Bittensor",
    chainId: "bittensor",
    symbol: "TAO",
    networkType: "substrate",
  },
  "mainnet::btc": {
    id: "btc-native",
    name: "Bitcoin",
    chainId: "bitcoin",
    symbol: "BTC",
    networkType: "btc",
  },
  "mainnet::astr": {
    id: subNativeTokenId("astar"),
    name: "Astar",
    symbol: "ASTR",
    chainId: "astar",
    networkType: "substrate",
  },
  "mainnet::azero": {
    id: subNativeTokenId("aleph-zero"),
    name: "Aleph Zero",
    symbol: "AZERO",
    chainId: "aleph-zero",
    networkType: "substrate",
  },
  "mainnet::aca": {
    id: subNativeTokenId("acala"),
    name: "ACALA",
    symbol: "ACA",
    chainId: "acala",
    networkType: "substrate",
  },
}

const api = createClient<StealthexApi>({ baseUrl: apiUrl })
const stealthexSdk = {
  getAllCurrencies: async (): Promise<StealthexCurrency[]> => {
    const allCurrencies: StealthexCurrency[] = []

    // TODO: When worker cache isn't warm, this takes too long to fetch all requests.
    const limit = 250
    for (let offset = 0; ; offset += limit) {
      const { data: currencies } = await api.GET("/v4/currencies", {
        params: { query: { limit, offset } },
      })
      if (!Array.isArray(currencies)) break

      allCurrencies.push(...currencies)
      if (currencies.length !== 250) break
    }

    return allCurrencies
  },
  getPairs: async ({
    symbol,
    network,
  }: {
    symbol: string
    network: string
  }): Promise<StealthexCurrency["available_routes"]> => {
    const { data: currency, error } = await api.GET("/v4/currencies/{symbol}/{network}", {
      params: { path: { symbol, network }, query: { include_available_routes: "true" } },
    })
    if (error) throw new Error(`${error.err.kind}: ${error.err.details}`)
    return currency?.available_routes
  },
  getRange: async ({
    route,
    estimation,
    rate,
    additional_fee_percent,
  }: {
    route: { from: { network: string; symbol: string }; to: { network: string; symbol: string } }
    estimation?: "direct" | "reversed"
    rate?: "floating" | "fixed"
    additional_fee_percent?: number
  }): Promise<{ min: BigNumber }> => {
    // default values
    estimation ||= "direct"
    rate ||= "floating"

    const params = {
      route,
      estimation,
      rate,
      additional_fee_percent,
    }
    if (params.additional_fee_percent === undefined) delete params.additional_fee_percent
    if (params.additional_fee_percent === 0.0) delete params.additional_fee_percent

    const { data: range, error } = await api.POST("/v4/rates/range", { body: params })
    if (error) throw new Error(`${error.err.kind}: ${error.err.details}`)
    return { min: BigNumber(range?.min_amount ?? 0) }
  },
  getEstimate: async ({
    route,
    amount,
    estimation,
    rate,
    additional_fee_percent,
  }: {
    route: { from: { network: string; symbol: string }; to: { network: string; symbol: string } }
    amount: number
    estimation?: "direct" | "reversed"
    rate?: "floating" | "fixed"
    additional_fee_percent?: number
  }): Promise<number> => {
    // default values
    estimation ||= "direct"
    rate ||= "floating"

    const params = {
      route,
      amount,
      estimation,
      rate,
      additional_fee_percent,
    }
    if (params.additional_fee_percent === undefined) delete params.additional_fee_percent
    if (params.additional_fee_percent === 0.0) delete params.additional_fee_percent

    const { data: estimate, error } = await api.POST("/v4/rates/estimated-amount", { body: params })
    if (error) throw new Error(`${error.err.kind}: ${error.err.details}`)
    return estimate?.estimated_amount
  },
  createExchange: async ({
    route,
    amount,
    estimation,
    rate,
    address,
    extra_id,
    refund_address,
    refund_extra_id,
    additional_fee_percent,
  }: {
    route: { from: { network: string; symbol: string }; to: { network: string; symbol: string } }
    amount: number
    estimation?: "direct" | "reversed"
    rate?: "floating" | "fixed"
    address: string
    extra_id?: string
    refund_address?: string
    refund_extra_id?: string
    additional_fee_percent?: number
  }): Promise<StealthexExchange> => {
    // default values
    estimation ||= "direct"
    rate ||= "floating"

    const params = {
      route,
      amount,
      estimation,
      rate,
      address,
      extra_id,
      refund_address,
      refund_extra_id,
      additional_fee_percent,
    }
    if (extra_id === undefined) delete params.extra_id
    if (refund_address === undefined) delete params.refund_address
    if (refund_extra_id === undefined) delete params.refund_extra_id
    if (params.additional_fee_percent === undefined) delete params.additional_fee_percent
    if (params.additional_fee_percent === 0.0) delete params.additional_fee_percent

    const { data: exchange, error } = await api.POST("/v4/exchanges", { body: params })
    if (error) throw new Error(`${error.err.kind}: ${error.err.details}`)
    return exchange
  },
  getExchange: async (id: string): Promise<StealthexExchange> => {
    const { data: exchange, error } = await api.GET("/v4/exchanges/{id}", {
      params: { path: { id } },
    })
    if (error) throw new Error(`${error.err.kind}: ${error.err.details}`)
    return exchange
  },
}

// --- Helper to get a viem PublicClient for an EVM network ---
const getPublicClient = async (evmNetworkId: EthNetworkId | string | undefined) => {
  if (!evmNetworkId) return undefined
  const evmNetwork = await firstValueFrom(getNetworkById$(evmNetworkId))
  const nativeToken = await firstValueFrom(getToken$(evmNetwork?.nativeTokenId))
  if (!evmNetwork || nativeToken?.type !== "evm-native" || evmNetwork.platform !== "ethereum")
    return undefined
  return getExtensionPublicClient(evmNetwork)
}

// --- Cached assets (promise-based to deduplicate concurrent calls) ---
let cachedAssetsPromise: Promise<SwappableAssetBaseType<{ stealthex: AssetContext }>[]> | null =
  null

const getStealthexAssets = async (
  _signal: AbortSignal
): Promise<SwappableAssetBaseType<{ stealthex: AssetContext }>[]> => {
  if (!cachedAssetsPromise) {
    cachedAssetsPromise = fetchStealthexAssets().catch((err) => {
      cachedAssetsPromise = null // clear on failure so retries work
      throw err
    })
  }
  return cachedAssetsPromise
}

const fetchStealthexAssets = async (): Promise<
  SwappableAssetBaseType<{ stealthex: AssetContext }>[]
> => {
  const allCurrencies = await stealthexSdk.getAllCurrencies()

  const supportedTokens = allCurrencies.filter((currency) => {
    const isEvmNetwork = !!supportedEvmNetworkIds[currency.network]
    const isSpecialAsset = !!specialAssets[`${currency.network}::${currency.symbol}`]

    // evm assets must be whitelisted as a special asset or have a contract address
    if (isEvmNetwork) return isSpecialAsset || !!currency.contract_address

    // substrate assets must be whitelisted as a special asset
    return isSpecialAsset
  })
  const knownTokens = await firstValueFrom(getTokensMap$())
  const knownEvmNetworks = await firstValueFrom(getNetworksMapById$({ platform: "ethereum" }))

  const result = Object.values(
    supportedTokens.reduce(
      (acc, currency) => {
        const evmNetworkId = supportedEvmNetworkIds[currency.network]
        const specialAsset = specialAssets[`${currency.network}::${currency.symbol}`]

        const id = evmNetworkId
          ? getTokenIdForSwappableAsset(
              "evm",
              evmNetworkId,
              currency.contract_address ? currency.contract_address : undefined
            )
          : specialAsset?.id
        const chainId = evmNetworkId ? Number(evmNetworkId) : specialAsset?.chainId
        if (!id || !chainId) return acc

        const evmNetwork = evmNetworkId ? knownEvmNetworks[evmNetworkId] : undefined
        const image =
          (knownTokens[id]?.logo !== UNKNOWN_TOKEN_URL ? knownTokens[id]?.logo : undefined) ??
          currency.icon_url
        const asset: SwappableAssetBaseType<{ stealthex: AssetContext }> = {
          id,
          name: specialAsset?.name ?? currency.name,
          symbol: specialAsset?.symbol ?? currency.symbol,
          decimals:
            specialAsset?.decimals ??
            evmNetwork?.nativeCurrency?.decimals ??
            currency?.precision ??
            undefined,
          chainId,
          contractAddress: currency.contract_address ? currency.contract_address : undefined,
          image,
          networkType: evmNetworkId ? "evm" : (specialAsset?.networkType ?? "substrate"),
          assetHubAssetId: specialAsset?.assetHubAssetId,
          context: {
            stealthex: {
              network: currency.network,
              symbol: currency.symbol,
            },
          },
        }
        // biome-ignore lint/performance/noAccumulatingSpread: legacy
        return { ...acc, [id]: asset }
      },
      {} as Record<string, SwappableAssetBaseType<{ stealthex: AssetContext }>>
    )
  )

  return result
}

type PairItem = NonNullable<StealthexCurrency["available_routes"]>[number]
const pairKeyFromPair = (pair: PairItem) => `${pair.network}::${pair.symbol}`
const pairKeyFromAsset = (asset: SwappableAssetBaseType) =>
  asset && `${asset.context?.stealthex?.network}::${asset.context?.stealthex?.symbol}`

const getPairs = async (fromAsset: SwappableAssetWithDecimals | null) => {
  const { symbol, network } = fromAsset?.context?.stealthex ?? {}
  if (!symbol || !network) return [] // not supported

  const pairs = await stealthexSdk.getPairs({ symbol, network })
  if (!pairs || !Array.isArray(pairs)) return []

  return pairs
}

const getRouteHasCustomFee = async (
  fromAsset: SwappableAssetWithDecimals | null,
  toAsset: SwappableAssetWithDecimals | null
): Promise<boolean> => {
  const pairs = await getPairs(fromAsset)
  if (!pairs || !Array.isArray(pairs)) return false

  if (!toAsset || !toAsset.context.stealthex) return false
  if (!("stealthex" in toAsset.context)) return false

  const toAssetKey = pairKeyFromAsset(toAsset)
  const pair = pairs.find((pair) => pairKeyFromPair(pair) === toAssetKey)
  if (!pair) return false

  return !!pair.features.includes("custom_fee")
}

const getFromAssets = async (signal: AbortSignal): Promise<SwappableAssetBaseType[]> => {
  return await getStealthexAssets(signal)
}

const getToAssets = async (
  fromAsset: SwappableAssetWithDecimals | null,
  signal: AbortSignal
): Promise<SwappableAssetBaseType[]> => {
  const allAssets = await getStealthexAssets(signal)
  if (!fromAsset) return allAssets

  const pairs = await getPairs(fromAsset)
  if (!pairs || !Array.isArray(pairs)) return []

  const validDestinations = new Set(pairs.map(pairKeyFromPair))
  const validDestAssets = allAssets.filter((asset) =>
    validDestinations.has(pairKeyFromAsset(asset))
  )

  return [fromAsset, ...validDestAssets]
}

const estimateGas = async (
  fromAsset: SwappableAssetWithDecimals,
  fromAddress: string,
  _fromAmount: bigint
): Promise<QuoteFee | null> => {
  if (fromAsset.networkType === "evm") {
    if (!isEthereumAddress(fromAddress)) return null // invalid ethereum address
    const knownEvmNetworks = await firstValueFrom(getNetworksMapById$({ platform: "ethereum" }))
    const network = knownEvmNetworks[fromAsset.chainId]
    const nativeToken = await firstValueFrom(getToken$(network?.nativeTokenId))

    const data = fromAsset.contractAddress
      ? encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [fromAddress, 0n] })
      : undefined

    if (network && nativeToken) {
      const client = await getPublicClient(network.id)
      if (!client) return null
      const gasPrice = await client.getGasPrice()
      // the to address and amount dont matter, we just need to place any address here for the estimation
      const gasLimit = await client.estimateGas({
        account: fromAddress as `0x${string}`,
        data,
        to: fromAsset.contractAddress ? (fromAsset.contractAddress as `0x${string}`) : fromAddress,
        value: 0n,
      })
      const amount = BigNumber(gasPrice.toString())
        .times(gasLimit.toString())
        .times(10 ** -(nativeToken.decimals ?? 0))
      return { name: "Est. Gas Fees", tokenId: nativeToken.id, amount }
    }

    return null
  }

  // cannot swap from BTC
  const swappingFromBtc = fromAsset.id === "btc-native"
  if (swappingFromBtc) return null

  // TODO: re-add substrate gas estimation
  // Previously used apiPromiseAtom to get an ApiPromise for the chain and estimate fees.
  // This needs to be re-implemented with chain connectors outside of Jotai.
  return null
}

const getQuote = async (params: QuoteParams, _signal: AbortSignal): Promise<BaseQuote | null> => {
  const { fromAsset, toAsset, fromAmount, fromAddress } = params

  if (!fromAsset || !toAsset || !fromAmount || fromAmount === 0n) return null
  const from: AssetContext = fromAsset.context.stealthex
  const to: AssetContext = toAsset.context.stealthex
  if (!from || !to) return null

  const fromAmountHuman = planckToTokens(fromAmount.toString(), fromAsset.decimals) ?? "0"

  const routeHasCustomFee = await getRouteHasCustomFee(fromAsset, toAsset)
  const additional_fee_percent = routeHasCustomFee
    ? getAdditionalFeePercent({ fromAsset, toAsset })
    : undefined
  const range = await stealthexSdk.getRange({ route: { from, to }, additional_fee_percent })
  if (range?.min.isGreaterThan(fromAmountHuman))
    throw new Error(`StealthEX minimum is ${range.min.toString()} ${fromAsset.symbol}`)

  try {
    // TODO: Return `null` or an error when getRange / getEstimate fails
    // Error format: `return { decentralisationScore: DECENTRALISATION_SCORE, protocol: PROTOCOL, inputAmountBN: fromAmount, outputAmountBN: 0n, error: '<error here>', timeInSec: 5 * 60, fees: [], providerLogo: LOGO, providerName: PROTOCOL_NAME, talismanFee: Math.max(getTalismanTotalFee({ fromAsset, toAsset }), BUILT_IN_FEE), }`
    const estimate = await stealthexSdk.getEstimate({
      route: { from, to },
      amount: Number(fromAmountHuman),
      additional_fee_percent,
    })

    const gasFee = fromAddress ? await estimateGas(fromAsset, fromAddress, fromAmount) : null
    // relative fee, multiply by fromAmount to get planck fee
    const talismanFee = Math.max(getTalismanTotalFee({ fromAsset, toAsset }), BUILT_IN_FEE)
    // add talisman fee
    const fees: QuoteFee[] = (gasFee ? [gasFee] : []).concat({
      amount: BigNumber(fromAmount.toString())
        .times(10 ** -fromAsset.decimals)
        .times(talismanFee),
      name: "Talisman Fee",
      tokenId: fromAsset.id,
    })

    return {
      decentralisationScore: DECENTRALISATION_SCORE,
      protocol: PROTOCOL,
      inputAmountBN: fromAmount,
      outputAmountBN: parseUserInputToPlanck(String(estimate), toAsset.decimals),
      // simpleswap swaps take about 5mins, assuming here that stealthex takes a similar amount of time
      timeInSec: 5 * 60,
      fees,
      providerLogo: LOGO,
      providerName: PROTOCOL_NAME,
      talismanFee,
    }
  } catch (cause) {
    // biome-ignore lint/suspicious/noConsole: legacy
    console.error(`Failed to get StealthEX quote`, cause)
    return null
  }
}

export type { StealthexExchange }

const createExchange = async (params: ExchangeParams): Promise<StealthexExchange | undefined> => {
  try {
    const { fromAsset, toAsset, fromAmount, fromAddress, toAddress } = params

    const substrateChains = await firstValueFrom(getNetworks$({ platform: "polkadot" }))
    const formatAddress = (
      address: string | null,
      asset: SwappableAssetWithDecimals<unknown> | null
    ) => {
      if (!address) return address
      if (asset?.networkType !== "substrate") return address

      const substrateChain = substrateChains.find(
        (c) => c.id.toString() === asset.chainId.toString()
      )
      if (!substrateChain) return address
      return encodeAnyAddress(address, { ss58Format: substrateChain.prefix })
    }

    if (!fromAsset) throw new Error("Missing from asset")
    if (!toAsset) throw new Error("Missing to asset")

    const allAccounts = await firstValueFrom(accounts$)

    const formattedFromAddress = formatAddress(fromAddress, fromAsset)
    const formattedToAddress = formatAddress(toAddress, toAsset)
    if (!formattedFromAddress) throw new Error("Missing from address")
    if (!formattedToAddress) throw new Error("Missing to address")

    const from: AssetContext = fromAsset.context.stealthex
    const to: AssetContext = toAsset.context.stealthex
    if (!from) throw new Error("Missing route from")
    if (!to) throw new Error("Missing route to")

    // validate from address for the source chain
    const fromAccount = allAccounts.find((account) =>
      isAddressEqual(account.address, formattedFromAddress)
    )
    const fromChain = substrateChains.find((c) => c.id.toString() === String(fromAsset.chainId))
    if (!validateAddress(fromAccount, formattedFromAddress, fromChain, fromAsset.networkType))
      throw new Error(
        `Cannot swap from ${fromAsset.chainId} chain with address: ${formattedFromAddress}`
      )

    // validate to address for the target chain
    const toAccount = allAccounts.find((account) =>
      isAddressEqual(account.address, formattedToAddress)
    )
    const toChain = substrateChains.find((c) => c.id.toString() === String(toAsset.chainId))
    if (!validateAddress(toAccount, formattedToAddress, toChain, toAsset.networkType))
      throw new Error(`Cannot swap to ${toAsset.chainId} chain with address: ${formattedToAddress}`)

    // cannot swap from BTC
    if (fromAsset.networkType === "btc") throw new Error("Swapping from BTC is not supported.")

    const routeHasCustomFee = await getRouteHasCustomFee(fromAsset, toAsset)

    const additional_fee_percent = routeHasCustomFee
      ? getAdditionalFeePercent({ fromAsset, toAsset })
      : undefined
    const fromAmountNum = Number(planckToTokens(fromAmount.toString(), fromAsset.decimals) ?? "0")

    const exchange = await stealthexSdk.createExchange({
      route: { from, to },
      amount: fromAmountNum,
      address: formattedToAddress,
      additional_fee_percent,
    })
    if (!exchange) throw new Error("Error creating exchange")

    // verify that the created exchange has the same assets we are trying to swap
    if (
      exchange.deposit.network !== from.network ||
      exchange.deposit.symbol !== from.symbol ||
      exchange.withdrawal.network !== to.network ||
      exchange.withdrawal.symbol !== to.symbol
    )
      throw new Error("Incorrect currencies from provider. Please try again later")
    if (exchange.deposit.amount > fromAmountNum) throw new Error("Quote changed. Please try again.")
    if (exchange.withdrawal.address !== formattedToAddress)
      throw new Error("Incorrect destination address from provider. Please try again later")

    return exchange
  } catch (cause) {
    // biome-ignore lint/suspicious/noConsole: legacy
    console.error(new Error("Failed to create exchange", { cause }))
    throw cause
  }
}

const getEvmTransaction = async (params: EvmTxParams): Promise<TransactionRequest | undefined> => {
  try {
    const { fromAsset, fromAddress, exchange: exchangeData } = params
    const exchange = exchangeData as StealthexExchange
    if (!fromAddress) throw new Error("Missing from address")
    if (!fromAsset) throw new Error("Missing from asset")
    if (!exchange) throw new Error("Missing exchange")

    if (fromAsset.networkType !== "evm") return

    const knownEvmNetworks = await firstValueFrom(getNetworksMapById$({ platform: "ethereum" }))
    const evmNetwork = knownEvmNetworks[fromAsset.chainId.toString()]
    if (!evmNetwork) throw new Error("Network not supported")

    const depositAmount = parseUserInputToPlanck(
      String(exchange.deposit.expected_amount),
      fromAsset.decimals
    )

    const publicClient = await getPublicClient(evmNetwork.id)
    if (!publicClient) throw new Error("Missing public client")

    if (!fromAsset.contractAddress)
      return publicClient.prepareTransactionRequest({
        chain: null,
        to: exchange.deposit.address as `0x${string}`,
        value: depositAmount,
        account: fromAddress as `0x${string}`,
      })

    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: [exchange.deposit.address as `0x${string}`, depositAmount],
    })
    return publicClient.prepareTransactionRequest({
      chain: null,
      to: fromAsset.contractAddress as `0x${string}`,
      data,
      value: 0n,
      account: fromAddress as `0x${string}`,
    })
  } catch (cause) {
    // biome-ignore lint/suspicious/noConsole: legacy
    console.error(new Error("Failed to create evm transaction", { cause }))
    throw cause
  }
}

const getSubstratePayload = async (
  params: SubstrateTxParams
): Promise<{
  payload: import("@core/domains/signing/types").SignerPayloadJSON
  txMetadata?: Uint8Array
} | null> => {
  try {
    const { fromAsset, fromAddress, exchange: exchangeData, sapi, allowReap } = params
    const exchange = exchangeData as StealthexExchange
    if (!sapi) return null

    if (!fromAddress) throw new Error("Missing from address")
    if (!fromAsset) throw new Error("Missing from asset")
    if (!exchange) throw new Error("Missing exchange")

    if (fromAsset.networkType !== "substrate") return null

    const depositAmount = parseUserInputToPlanck(
      String(exchange.deposit.expected_amount),
      fromAsset.decimals
    )

    const payload =
      fromAsset.assetHubAssetId !== undefined
        ? await sapi.getExtrinsicPayload(
            "Assets",
            allowReap ? "transfer" : "transfer_keep_alive",
            {
              id: fromAsset.assetHubAssetId,
              target: MultiAddress.Id(exchange.deposit.address),
              amount: depositAmount,
            },
            { address: fromAddress }
          )
        : await sapi.getExtrinsicPayload(
            "Balances",
            allowReap ? "transfer_allow_death" : "transfer_keep_alive",
            { dest: MultiAddress.Id(exchange.deposit.address), value: depositAmount },
            { address: fromAddress }
          )

    return payload
  } catch (cause) {
    // biome-ignore lint/suspicious/noConsole: legacy
    console.error(new Error("Failed to create substrate payload", { cause }))
    throw cause
  }
}

export const stealthexSwapModule: SwapModule = {
  protocol: PROTOCOL,
  decentralisationScore: DECENTRALISATION_SCORE,
  getFromAssets: getFromAssets,
  getToAssets: getToAssets,
  getQuote: getQuote,
  createExchange: createExchange,
  getEvmTransaction: getEvmTransaction,
  getSubstratePayload: getSubstratePayload,
}

export const swapStatus$ = (id: string): Observable<StealthexExchange["status"] | undefined> =>
  retryStatus$(id).pipe(
    switchMap((status) => {
      if (status === undefined) return of(undefined)

      const shouldRefresh = (status: StealthexExchange["status"] | undefined) =>
        !(status && ["finished", "failed", "expired", "refunded"].includes(status))

      // refresh every 20s if status isn't final
      if (shouldRefresh(status)) {
        return interval(20_000).pipe(
          startWith(-1),
          switchMap((i) => (i === -1 ? of(status) : retryStatus$(id))),
          takeWhile((status) => shouldRefresh(status), true)
        )
      }
      return of(status)
    })
  )

const retryStatus$ = (id: string): Observable<StealthexExchange["status"] | undefined> =>
  defer(() => stealthexSdk.getExchange(id).then((exchange) => exchange.status)).pipe(
    // retry up to 10 times, wait 5s between each retry
    retry({ count: 10, delay: 5_000 }),

    // log when all retries failed, and return undefined
    catchError((error) => {
      // biome-ignore lint/suspicious/noConsole: legacy
      console.error(`Failed to fetch exchange status for '${id}'`, error)
      return of(undefined)
    })
  )
