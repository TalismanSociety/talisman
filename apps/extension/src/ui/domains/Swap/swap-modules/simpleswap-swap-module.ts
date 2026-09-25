import { UNKNOWN_TOKEN_URL } from "@common/constants"
import {
  isAccountCompatibleWithNetwork,
  isAddressCompatibleWithNetwork,
} from "@core/domains/accounts/helpers"
import { remoteConfigStore } from "@core/domains/app/store.remoteConfig"
import { btcNativeTokenId, parseTokenId } from "@talismn/chaindata-provider"
import { encodeAnyAddress, isAddressEqual } from "@talismn/crypto"
import { planckToTokens } from "@talismn/util"
import { accounts$ } from "@ui/state/accounts"
import { getNetworks$, getNetworksMapById$, getTokensMap$ } from "@ui/state/chaindata"
import BigNumber from "bignumber.js"
import { firstValueFrom } from "rxjs"
import { parseUserInputToPlanck } from "../swap-utils"
import {
  type BaseQuote,
  type ExchangeParams,
  type GetTransactionParams,
  getTokenIdForSwappableAsset,
  platformFromTokenId,
  type QuoteFee,
  type QuoteParams,
  type SupportedSwapProtocol,
  type SwapExchange,
  type SwapModule,
  type SwapModuleTransaction,
  type SwappableAssetBaseType,
} from "./common.swap-module"
import type { QuoteResponse } from "./common.swap-module.ts"
import {
  buildDepositTransaction,
  type DepositInfo,
  estimateDepositGas,
} from "./deposit-swap-transactions"
import { getSimpleSwapApiKey as getApiKeyFromUtils, getSimpleSwapTalismanFee } from "./fee-utils"
import { assertDepositAmountWithinInput } from "./provider-transaction-guards"
import simpleswapLogo from "./simpleswap-logo.svg?url"

const PROTOCOL: SupportedSwapProtocol = "simpleswap"
const PROTOCOL_NAME = "SimpleSwap"
const DECENTRALISATION_SCORE = 1

type RouteProps = { currencyFrom: string; currencyTo: string }
const getTalismanFee = (route: RouteProps) => getSimpleSwapTalismanFee(route)
const getApiKey = (route: RouteProps) => getApiKeyFromUtils(route)

const LOGO = simpleswapLogo

// bitcoin is not yet in the server-side swap whitelist — detect native BTC directly
const isNativeBtcCurrency = (currency: {
  symbol: string
  network: string
  contract_address: string | null
}) =>
  currency.symbol?.toLowerCase() === "btc" &&
  !currency.contract_address &&
  ["btc", "bitcoin", "mainnet", ""].includes((currency.network ?? "").toLowerCase())

type SimpleSwapCurrency = {
  name: string
  network: string
  symbol: string
  precision: number | null
  contract_address: string | null
  extra_id: string
  has_extra_id: boolean
  address_explorer: string
  confirmations_from: string
  image: string
  isFiat: boolean
}

type SimpleSwapAssetContext = {
  symbol: string
}

type Exchange = {
  id: string
  type: string
  timestamp: string
  updated_at: string
  valid_until: null
  currency_from: string
  currency_to: string
  amount_from: string
  expected_amount: string
  amount_to: string
  address_from: string
  address_to: string
  user_refund_address: string | null
  tx_from: null
  tx_to: null
  status: "waiting" | "confirming" | "exchanging" | "sending" | "finished" | "failed"
  redirect_url: null
  currencies: Record<
    string,
    {
      name: string
      symbol: string
      network: string
      image: string
      warnings_from: string[]
      warnings_to: string[]
      validation_address: string
      address_explorer: string
      tx_explorer: string
      confirmations_from: string
      contract_address: string | null
      isFiat: boolean
    }
  >
  trace_id: string
  code?: number
  description?: string
  error?: string
}

type Range = { min: BigNumber }

const simpleSwapSdk = {
  getAllCurrencies: async (): Promise<SimpleSwapCurrency[]> => {
    const { simpleswapApiKey } = await remoteConfigStore.get("swaps")
    const allCurrenciesRes = await fetch(
      `https://api.simpleswap.io/get_all_currencies?api_key=${simpleswapApiKey}`
    )
    return await allCurrenciesRes.json()
  },
  getEstimate: async (props: {
    currencyFrom: string
    currencyTo: string
    amount: string
    fixed: boolean
  }): Promise<
    string | { code: number; error: string; description: string; trace_id: string } | null
  > => {
    try {
      const api_key = await getApiKey(props)
      if (!api_key) throw new Error("Simpleswap api key not found")
      const search = new URLSearchParams({
        api_key,
        fixed: `${props.fixed}`,
        currency_from: props.currencyFrom,
        currency_to: props.currencyTo,
        amount: props.amount,
      })
      const allCurrenciesRes = await fetch(
        `https://api.simpleswap.io/get_estimated?${search.toString()}`
      )
      return await allCurrenciesRes.json()
    } catch (cause) {
      // biome-ignore lint/suspicious/noConsole: legacy
      console.error(new Error("Failed to fetch all simpleswap currencies", { cause }))
      return null
    }
  },
  getPairs: async (props: {
    symbol: string
    fixed: boolean
  }): Promise<
    string[] | { code: number; error: string; description: string; trace_id: string } | null
  > => {
    try {
      const { simpleswapApiKey } = await remoteConfigStore.get("swaps")
      if (!simpleswapApiKey) throw new Error("Simpleswap api key not found")
      const search = new URLSearchParams({
        api_key: simpleswapApiKey,
        fixed: `${props.fixed}`,
        symbol: props.symbol,
      })
      const allPairs = await fetch(`https://api.simpleswap.io/get_pairs?${search.toString()}`)
      return await allPairs.json()
    } catch (cause) {
      // biome-ignore lint/suspicious/noConsole: legacy
      console.error(new Error("Failed to fetch simpleswap pairs", { cause }))
      return null
    }
  },
  createExchange: async (props: {
    fixed: boolean
    currency_from: string
    currency_to: string
    amount: number
    address_to: string
    extra_id_to?: string
    user_refund_address: string | null
    user_refund_extra_id: string | null
  }): Promise<Exchange> => {
    const api_key = await getApiKey({
      currencyFrom: props.currency_from,
      currencyTo: props.currency_to,
    })
    if (!api_key) throw new Error("Simpleswap api key not found")
    const search = new URLSearchParams({ api_key: api_key })
    const exchange = await fetch(`https://api.simpleswap.io/create_exchange?${search.toString()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(props),
    })

    return exchange.json()
  },
  getExchange: async (id: string): Promise<Exchange> => {
    const { simpleswapApiKey } = await remoteConfigStore.get("swaps")
    if (!simpleswapApiKey) throw new Error("Simpleswap api key not found")
    const search = new URLSearchParams({ api_key: simpleswapApiKey, id })
    const exchange = await fetch(`https://api.simpleswap.io/get_exchange?${search.toString()}`)
    return exchange.json()
  },
  getRange: async (props: {
    currency_from: string
    currency_to: string
  }): Promise<Range | undefined> => {
    const api_key = await getApiKey({
      currencyFrom: props.currency_from,
      currencyTo: props.currency_to,
    })
    if (!api_key) throw new Error("Simpleswap api key not found")
    const search = new URLSearchParams({
      api_key,
      fixed: "false",
      ...props,
    })
    const json:
      | { min?: string; trace_id?: string }
      | { code?: number; error?: string; description?: string; trace_id?: string } = await (
      await fetch(`https://api.simpleswap.io/get_ranges?${search.toString()}`)
    ).json()

    if ("error" in json) throw new Error(json.error)
    if (!("min" in json)) return

    if (typeof json.min !== "string") return

    return { min: BigNumber(json.min) }
  },
}

// --- Internal asset type for SimpleSwap (not exposed) ---
type SimpleswapInternalAsset = SwappableAssetBaseType<{ simpleswap: SimpleSwapAssetContext }> & {
  decimals: number
}

// --- Internal lookup cache keyed by tokenId ---
const assetsByTokenId = new Map<string, SimpleswapInternalAsset>()

const resolveAsset = (tokenId: string): SimpleswapInternalAsset | undefined =>
  assetsByTokenId.get(tokenId)

// --- Cached assets (promise-based to deduplicate concurrent calls) ---
let cachedAssetsPromise: Promise<SimpleswapInternalAsset[]> | null = null

const getSimpleswapAssets = async (_signal: AbortSignal): Promise<SimpleswapInternalAsset[]> => {
  if (!cachedAssetsPromise) {
    cachedAssetsPromise = fetchSimpleswapAssets().catch((err) => {
      cachedAssetsPromise = null // clear on failure so retries work
      throw err
    })
  }
  return cachedAssetsPromise
}

const fetchSimpleswapAssets = async (): Promise<SimpleswapInternalAsset[]> => {
  const [allCurrencies, { simpleswap: mappings }, knownEvmNetworks, knownTokens] =
    await Promise.all([
      simpleSwapSdk.getAllCurrencies(),
      remoteConfigStore.get("swaps"),
      firstValueFrom(getNetworksMapById$({ platform: "ethereum" })),
      firstValueFrom(getTokensMap$()),
    ])
  const { networks, tokens } = mappings

  const supportedTokens = allCurrencies.filter((currency) => {
    if (currency.isFiat) return false
    if (isNativeBtcCurrency(currency)) return true
    const networkId = networks[currency.network]
    const isSpecialAsset = !!tokens[currency.symbol]

    // network-mapped assets must be whitelisted as a special asset or have a contract address
    if (networkId) return isSpecialAsset || !!currency.contract_address

    // other assets (substrate etc.) must be whitelisted as a special asset
    return isSpecialAsset
  })

  const result = Object.values(
    supportedTokens.reduce(
      (acc, currency) => {
        const networkId = networks[currency.network]
        const specialTokenId = tokens[currency.symbol]

        // Resolve the Talisman token ID
        const contractAddress = currency.contract_address || undefined
        // bitcoin isn't in the server-side whitelist yet; map native BTC locally
        const id = isNativeBtcCurrency(currency)
          ? btcNativeTokenId("bitcoin")
          : networkId
            ? getTokenIdForSwappableAsset(
                knownEvmNetworks[networkId] ? "ethereum" : "solana",
                networkId,
                contractAddress
              )
            : specialTokenId
        if (!id) return acc

        const token = knownTokens[id]
        if (!token) return acc

        const parsed = specialTokenId ? parseTokenId(specialTokenId) : undefined
        const chainId = isNativeBtcCurrency(currency) ? "bitcoin" : (networkId ?? parsed?.networkId)
        if (!chainId) return acc

        const asset: SimpleswapInternalAsset = {
          id,
          name: token.name ?? currency.name,
          symbol: token.symbol,
          decimals: token.decimals,
          chainId,
          contractAddress,
          image: (token.logo !== UNKNOWN_TOKEN_URL ? token.logo : undefined) ?? currency.image,
          platform: platformFromTokenId(id),
          assetHubAssetId:
            parsed?.type === "substrate-assets"
              ? parseTokenId<"substrate-assets">(specialTokenId!).assetId
              : undefined,
          context: {
            simpleswap: {
              symbol: currency.symbol,
            },
          },
        }
        // biome-ignore lint/performance/noAccumulatingSpread: legacy
        return { ...acc, [id]: asset }
      },
      {} as Record<string, SimpleswapInternalAsset>
    )
  )

  // Populate the lookup cache
  assetsByTokenId.clear()
  for (const asset of result) assetsByTokenId.set(asset.id, asset)

  return result
}

const pairKeyFromPair = (pair: string) => pair.toLowerCase()

const getPairs = async (fromTokenId: string | null) => {
  const fromAsset = fromTokenId ? resolveAsset(fromTokenId) : null
  const { symbol } = fromAsset?.context?.simpleswap ?? {}
  if (!symbol) return [] // not supported

  const pairs = await simpleSwapSdk.getPairs({ symbol, fixed: false })
  if (!pairs || !Array.isArray(pairs)) return []

  return pairs
}

const getFromAssets = async (signal: AbortSignal): Promise<string[]> => {
  const assets = await getSimpleswapAssets(signal)
  return assets.map((a) => a.id)
}

const getToAssets = async (fromTokenId: string | null, signal: AbortSignal): Promise<string[]> => {
  const allAssets = await getSimpleswapAssets(signal)
  if (!fromTokenId) return allAssets.map((a) => a.id)

  const pairs = await getPairs(fromTokenId)
  if (!pairs || !Array.isArray(pairs)) return []

  const validDestinations = new Set(pairs.map(pairKeyFromPair))
  const validDestAssets = allAssets.filter((asset) =>
    validDestinations.has(asset.context.simpleswap?.symbol.toLowerCase())
  )

  return [fromTokenId, ...validDestAssets.map((a) => a.id)]
}

const getQuote = async (
  params: QuoteParams,
  _signal: AbortSignal
): Promise<(BaseQuote & { data?: QuoteResponse }) | null> => {
  const { fromTokenId, toTokenId, fromAmount, fromAddress } = params
  if (!fromTokenId || !toTokenId) return null

  const fromAsset = resolveAsset(fromTokenId)
  const toAsset = resolveAsset(toTokenId)
  if (!fromAsset || !toAsset || !fromAmount || fromAmount === 0n) return null
  const currencyFrom = fromAsset.context.simpleswap?.symbol
  const currencyTo = toAsset.context.simpleswap?.symbol
  if (!currencyFrom || !currencyTo) return null

  const fromAmountHuman = planckToTokens(fromAmount.toString(), fromAsset.decimals) ?? "0"

  const range = await simpleSwapSdk.getRange({
    currency_from: currencyFrom,
    currency_to: currencyTo,
  })
  if (range?.min.isGreaterThan(fromAmountHuman))
    throw new Error(`SimpleSwap minimum is ${range.min.toString()} ${fromAsset.symbol}`)

  const output = await simpleSwapSdk.getEstimate({
    amount: fromAmountHuman,
    currencyFrom,
    currencyTo,
    fixed: false,
  })
  const talismanFee = await getTalismanFee({ currencyFrom, currencyTo })

  // check for error object
  if (!output || typeof output !== "string") {
    if (output && typeof output !== "string") {
      return {
        decentralisationScore: DECENTRALISATION_SCORE,
        protocol: PROTOCOL,
        inputAmountBN: fromAmount,
        outputAmountBN: 0n,
        error: output.description,
        timeInSec: 5 * 60,
        fees: [],
        providerLogo: LOGO,
        providerName: PROTOCOL_NAME,
        talismanFee,
      }
    }
    return null
  }

  const gasFee = fromAddress ? await estimateDepositGas(fromAsset, fromAddress) : null
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
    outputAmountBN: parseUserInputToPlanck(output, toAsset.decimals),
    // swaps take about 5mins according to their faq: https://simpleswap.io/faq#crypto-to-crypto-exchanges--how-long-does-it-take-to-exchange-coins
    timeInSec: 5 * 60,
    fees,
    providerLogo: LOGO,
    providerName: PROTOCOL_NAME,
    talismanFee,
  }
}

export const saveIdForMonitoring = async (swapId: string, txHash: string) => {
  await fetch(`https://swap-providers-monitor.fly.dev/simpleswap/exchange`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: swapId, deposit_tx_hash: txHash }),
  })
}

/** @knipignore Used by swap-protocols.ts via dynamic import type to avoid circular deps. */
export type SimpleswapExchange = Exchange

const createExchange = async (params: ExchangeParams): Promise<SwapExchange | null> => {
  try {
    const { fromTokenId, toTokenId, fromAmount, fromAddress, toAddress } = params

    const fromAsset = resolveAsset(fromTokenId)
    const toAsset = resolveAsset(toTokenId)

    const substrateChains = await firstValueFrom(getNetworks$({ platform: "polkadot" }))
    const formatAddress = (address: string | null, asset: SimpleswapInternalAsset | undefined) => {
      if (!address) return address
      if (asset?.platform !== "polkadot") return address

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

    const currency_from = fromAsset.context?.simpleswap?.symbol as string
    const currency_to = toAsset.context?.simpleswap?.symbol as string
    if (!currency_from) throw new Error("Missing currency from")
    if (!currency_to) throw new Error("Missing currency to")

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

    const exchange = await simpleSwapSdk.createExchange({
      fixed: false,
      address_to: formattedToAddress,
      amount: Number(planckToTokens(fromAmount.toString(), fromAsset.decimals) ?? "0"),
      currency_from,
      currency_to,
      extra_id_to: "",
      user_refund_address: null,
      user_refund_extra_id: null,
    })
    if (!exchange) throw new Error("Error creating exchange")

    if (exchange.code === 422) {
      const min = exchange.description?.match(/min: ([0-9.]+)/i)?.[1]
      const max = exchange.description?.match(/max: ([0-9.]+)/i)?.[1]
      const message = [
        "Amount is out of range",
        min && `(min: ${min} ${fromAsset.symbol})`,
        max && `(max: ${max} ${fromAsset.symbol})`,
      ].join(" ")
      throw new Error(message)
    }
    if (exchange.code === 500) throw new Error("Failed to create exchange. Please try again later")

    // verify that the created exchange has the same assets we are trying to swap
    if (exchange.currency_from !== currency_from || exchange.currency_to !== currency_to) {
      // biome-ignore lint/suspicious/noConsole: legacy
      console.trace(
        "exchange.currency_from",
        exchange.currency_from,
        "currency_from",
        currency_from,
        "exchange.currency_to",
        exchange.currency_to,
        "currency_to",
        currency_to
      )
      throw new Error("Incorrect currencies from provider. Please try again later")
    }
    assertDepositAmountWithinInput({
      depositAmount: exchange.expected_amount,
      fromAmount,
      decimals: fromAsset.decimals,
    })
    if (exchange.address_to !== formattedToAddress)
      throw new Error("Incorrect destination address from provider. Please try again later")

    return { protocol: "simpleswap", data: exchange }
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

  const exchange = params.exchange as Exchange | undefined
  if (!exchange?.address_from) throw new Error("Missing exchange")

  assertDepositAmountWithinInput({
    depositAmount: exchange.expected_amount,
    fromAmount: params.fromAmount,
    decimals: fromAsset.decimals,
  })

  const deposit: DepositInfo = {
    depositAddress: exchange.address_from,
    depositAmount: exchange.expected_amount,
  }

  return buildDepositTransaction({
    fromAsset,
    fromAddress: params.fromAddress,
    deposit,
    context: params.context,
  })
}

export const simpleswapSwapModule: SwapModule = {
  protocol: PROTOCOL,
  decentralisationScore: DECENTRALISATION_SCORE,
  getFromAssets: getFromAssets,
  getToAssets: getToAssets,
  getQuote: getQuote,
  createExchange: createExchange,
  getTransaction: getTransaction,
}
