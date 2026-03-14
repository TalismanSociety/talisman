import { UNKNOWN_TOKEN_URL } from "@common/constants"
import {
  isAccountCompatibleWithNetwork,
  isAddressCompatibleWithNetwork,
} from "@core/domains/accounts/helpers"
import { evmNativeTokenId, subAssetTokenId, subNativeTokenId } from "@talismn/balances-react"
import { type EthNetworkId, solNativeTokenId } from "@talismn/chaindata-provider"
import { encodeAnyAddress, isAddressEqual } from "@talismn/crypto"
import { planckToTokens } from "@talismn/util"
import { accounts$ } from "@ui/state/accounts"
import { getNetworks$, getTokensMap$ } from "@ui/state/chaindata"
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
import { parseUserInputToPlanck } from "../swap-utils"
import {
  type BaseQuote,
  type ExchangeParams,
  type GetTransactionParams,
  getTokenIdForSwappableAsset,
  type QuoteFee,
  type QuoteParams,
  type SupportedSwapProtocol,
  type SwapExchange,
  type SwapModule,
  type SwapModuleTransaction,
  type SwappableAssetBaseType,
} from "./common.swap-module"
import {
  buildDepositTransaction,
  type DepositInfo,
  estimateDepositGas,
} from "./deposit-swap-transactions"
import {
  STEALTHEX_BUILT_IN_FEE as BUILT_IN_FEE,
  getStealthexAdditionalFeePercent,
  getStealthexTalismanTotalFee,
} from "./fee-utils"
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

type AssetContext = {
  network: string
  symbol: string
}

// --- Internal asset type for StealthEX (not exposed) ---
type StealthexInternalAsset = SwappableAssetBaseType<{ stealthex: AssetContext }> & {
  decimals: number
}

type FeeProps = { fromAsset: StealthexInternalAsset; toAsset: StealthexInternalAsset }

const getTalismanTotalFee = (feeProps: FeeProps) => getStealthexTalismanTotalFee(feeProps)
const getAdditionalFeePercent = (feeProps: FeeProps) => getStealthexAdditionalFeePercent(feeProps)

const LOGO = stealthexLogo

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

const SOLANA_NETWORK_KEY = "sol"
const SOLANA_NETWORK_ID = "solana-mainnet"

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
  "mainnet::sol": {
    id: solNativeTokenId("solana-mainnet"),
    name: "Solana",
    symbol: "SOL",
    chainId: "solana-mainnet",
    networkType: "solana",
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

// --- Internal lookup cache keyed by tokenId ---
const assetsByTokenId = new Map<string, StealthexInternalAsset>()

const resolveAsset = (tokenId: string): StealthexInternalAsset | undefined =>
  assetsByTokenId.get(tokenId)

// --- Cached assets (promise-based to deduplicate concurrent calls) ---
let cachedAssetsPromise: Promise<StealthexInternalAsset[]> | null = null

const getStealthexAssets = async (_signal: AbortSignal): Promise<StealthexInternalAsset[]> => {
  if (!cachedAssetsPromise) {
    cachedAssetsPromise = fetchStealthexAssets().catch((err) => {
      cachedAssetsPromise = null // clear on failure so retries work
      throw err
    })
  }
  return cachedAssetsPromise
}

const fetchStealthexAssets = async (): Promise<StealthexInternalAsset[]> => {
  const allCurrencies = await stealthexSdk.getAllCurrencies()

  const supportedTokens = allCurrencies.filter((currency) => {
    const isEvmNetwork = !!supportedEvmNetworkIds[currency.network]
    const isSpecialAsset = !!specialAssets[`${currency.network}::${currency.symbol}`]

    // evm assets must be whitelisted as a special asset or have a contract address
    if (isEvmNetwork) return isSpecialAsset || !!currency.contract_address

    // solana assets must be whitelisted as a special asset or have a contract address (SPL tokens)
    const isSolNetwork = currency.network === SOLANA_NETWORK_KEY
    if (isSolNetwork) return isSpecialAsset || !!currency.contract_address

    // substrate assets must be whitelisted as a special asset
    return isSpecialAsset
  })
  const knownTokens = await firstValueFrom(getTokensMap$())

  const result = Object.values(
    supportedTokens.reduce(
      (acc, currency) => {
        const evmNetworkId = supportedEvmNetworkIds[currency.network]
        const specialAsset = specialAssets[`${currency.network}::${currency.symbol}`]
        const isSolNetwork = currency.network === SOLANA_NETWORK_KEY

        const id = evmNetworkId
          ? getTokenIdForSwappableAsset(
              "evm",
              evmNetworkId,
              currency.contract_address ? currency.contract_address : undefined
            )
          : isSolNetwork
            ? getTokenIdForSwappableAsset(
                "solana",
                SOLANA_NETWORK_ID,
                currency.contract_address ? currency.contract_address : undefined
              )
            : specialAsset?.id
        const chainId = evmNetworkId
          ? Number(evmNetworkId)
          : isSolNetwork
            ? SOLANA_NETWORK_ID
            : specialAsset?.chainId
        if (!id || !chainId) return acc

        const token = knownTokens[id]
        if (!token) return acc

        const asset: StealthexInternalAsset = {
          id,
          name: token.name ?? currency.name,
          symbol: token.symbol,
          decimals: token.decimals,
          chainId,
          contractAddress: currency.contract_address ? currency.contract_address : undefined,
          image: (token.logo !== UNKNOWN_TOKEN_URL ? token.logo : undefined) ?? currency.icon_url,
          networkType: evmNetworkId
            ? "evm"
            : isSolNetwork
              ? "solana"
              : (specialAsset?.networkType ?? "substrate"),
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
      {} as Record<string, StealthexInternalAsset>
    )
  )

  // Populate the lookup cache
  assetsByTokenId.clear()
  for (const asset of result) assetsByTokenId.set(asset.id, asset)

  return result
}

type PairItem = NonNullable<StealthexCurrency["available_routes"]>[number]
const pairKeyFromPair = (pair: PairItem) => `${pair.network}::${pair.symbol}`

const getPairs = async (fromTokenId: string | null) => {
  const fromAsset = fromTokenId ? resolveAsset(fromTokenId) : null
  const { symbol, network } = fromAsset?.context?.stealthex ?? {}
  if (!symbol || !network) return [] // not supported

  const pairs = await stealthexSdk.getPairs({ symbol, network })
  if (!pairs || !Array.isArray(pairs)) return []

  return pairs
}

const getRouteHasCustomFee = async (
  fromTokenId: string | null,
  toTokenId: string | null
): Promise<boolean> => {
  const pairs = await getPairs(fromTokenId)
  if (!pairs || !Array.isArray(pairs)) return false

  const toAsset = toTokenId ? resolveAsset(toTokenId) : null
  if (!toAsset || !toAsset.context.stealthex) return false

  const toAssetKey = `${toAsset.context.stealthex.network}::${toAsset.context.stealthex.symbol}`
  const pair = pairs.find((pair) => pairKeyFromPair(pair) === toAssetKey)
  if (!pair) return false

  return !!pair.features.includes("custom_fee")
}

const getFromAssets = async (signal: AbortSignal): Promise<string[]> => {
  const assets = await getStealthexAssets(signal)
  return assets.map((a) => a.id)
}

const getToAssets = async (fromTokenId: string | null, signal: AbortSignal): Promise<string[]> => {
  const allAssets = await getStealthexAssets(signal)
  if (!fromTokenId) return allAssets.map((a) => a.id)

  const pairs = await getPairs(fromTokenId)
  if (!pairs || !Array.isArray(pairs)) return []

  const validDestinations = new Set(pairs.map(pairKeyFromPair))
  const validDestAssets = allAssets.filter((asset) =>
    validDestinations.has(`${asset.context.stealthex.network}::${asset.context.stealthex.symbol}`)
  )

  return [fromTokenId, ...validDestAssets.map((a) => a.id)]
}

const getQuote = async (params: QuoteParams, _signal: AbortSignal): Promise<BaseQuote | null> => {
  const { fromTokenId, toTokenId, fromAmount, fromAddress } = params
  if (!fromTokenId || !toTokenId) return null

  const fromAsset = resolveAsset(fromTokenId)
  const toAsset = resolveAsset(toTokenId)
  if (!fromAsset || !toAsset || !fromAmount || fromAmount === 0n) return null
  const from: AssetContext = fromAsset.context.stealthex
  const to: AssetContext = toAsset.context.stealthex
  if (!from || !to) return null

  const fromAmountHuman = planckToTokens(fromAmount.toString(), fromAsset.decimals) ?? "0"

  const routeHasCustomFee = await getRouteHasCustomFee(fromTokenId, toTokenId)
  const additional_fee_percent = routeHasCustomFee
    ? getAdditionalFeePercent({ fromAsset, toAsset })
    : undefined
  const range = await stealthexSdk.getRange({ route: { from, to }, additional_fee_percent })
  if (range?.min.isGreaterThan(fromAmountHuman))
    throw new Error(`StealthEX minimum is ${range.min.toString()} ${fromAsset.symbol}`)

  try {
    const estimate = await stealthexSdk.getEstimate({
      route: { from, to },
      amount: Number(fromAmountHuman),
      additional_fee_percent,
    })

    const gasFee = fromAddress ? await estimateDepositGas(fromAsset, fromAddress) : null
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
      outputAmountBN: parseUserInputToPlanck(BigNumber(estimate).toFixed(), toAsset.decimals),
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

const createExchange = async (params: ExchangeParams): Promise<SwapExchange | null> => {
  try {
    const { fromTokenId, toTokenId, fromAmount, fromAddress, toAddress } = params

    const fromAsset = resolveAsset(fromTokenId)
    const toAsset = resolveAsset(toTokenId)

    const substrateChains = await firstValueFrom(getNetworks$({ platform: "polkadot" }))
    const formatAddress = (address: string | null, asset: StealthexInternalAsset | undefined) => {
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

    const allNetworks = await firstValueFrom(getNetworks$())

    // validate from address for the source chain
    const fromAccount = allAccounts.find((account) =>
      isAddressEqual(account.address, formattedFromAddress)
    )
    const fromNetwork = allNetworks.find((n) => n.id.toString() === String(fromAsset.chainId))
    if (fromAccount) {
      if (fromNetwork && !isAccountCompatibleWithNetwork(fromNetwork, fromAccount))
        throw new Error(
          `Cannot swap from ${fromAsset.chainId} chain with address: ${formattedFromAddress}`
        )
    } else if (fromNetwork && !isAddressCompatibleWithNetwork(fromNetwork, formattedFromAddress)) {
      throw new Error(
        `Cannot swap from ${fromAsset.chainId} chain with address: ${formattedFromAddress}`
      )
    }

    // validate to address for the target chain
    const toAccount = allAccounts.find((account) =>
      isAddressEqual(account.address, formattedToAddress)
    )
    const toNetwork = allNetworks.find((n) => n.id.toString() === String(toAsset.chainId))
    if (toAccount) {
      if (toNetwork && !isAccountCompatibleWithNetwork(toNetwork, toAccount))
        throw new Error(
          `Cannot swap to ${toAsset.chainId} chain with address: ${formattedToAddress}`
        )
    } else if (toNetwork && !isAddressCompatibleWithNetwork(toNetwork, formattedToAddress)) {
      throw new Error(`Cannot swap to ${toAsset.chainId} chain with address: ${formattedToAddress}`)
    }

    const routeHasCustomFee = await getRouteHasCustomFee(fromTokenId, toTokenId)

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

    return { protocol: "stealthex", data: exchange }
  } catch (cause) {
    // biome-ignore lint/suspicious/noConsole: legacy
    console.error(new Error("Failed to create exchange", { cause }))
    throw cause
  }
}

const getTransaction = async (
  params: GetTransactionParams
): Promise<SwapModuleTransaction | null> => {
  const fromAsset = resolveAsset(params.fromTokenId)
  if (!fromAsset) throw new Error("Missing from asset")

  const exchange = params.exchange as StealthexExchange | undefined
  if (!exchange?.deposit?.address) throw new Error("Missing exchange")

  const deposit: DepositInfo = {
    depositAddress: exchange.deposit.address,
    depositAmount: BigNumber(exchange.deposit.expected_amount).toFixed(),
  }

  return buildDepositTransaction({
    fromAsset,
    fromAddress: params.fromAddress,
    deposit,
    context: params.context,
  })
}

export const stealthexSwapModule: SwapModule = {
  protocol: PROTOCOL,
  decentralisationScore: DECENTRALISATION_SCORE,
  getFromAssets: getFromAssets,
  getToAssets: getToAssets,
  getQuote: getQuote,
  createExchange: createExchange,
  getTransaction: getTransaction,
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
