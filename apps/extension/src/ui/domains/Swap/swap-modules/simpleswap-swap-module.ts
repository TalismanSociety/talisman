import { UNKNOWN_TOKEN_URL } from "@common/constants"
import { log } from "@common/log"
import {
  isAccountCompatibleWithNetwork,
  isAddressCompatibleWithNetwork,
} from "@core/domains/accounts/helpers"
import { assertDepositAmountWithinInput } from "@core/domains/swaps/exports"
import { quoteFromLegs, TALISMAN_FEE_NAME } from "@core/domains/swaps/helpers"
import type {
  BaseQuote,
  BuiltLeg,
  QuoteFee,
  QuoteParams,
  SupportedSwapProtocol,
} from "@core/domains/swaps/types"
import { parseTokenId } from "@talismn/chaindata-provider"
import { encodeAnyAddress, isAddressEqual } from "@talismn/crypto"
import { planckToTokens } from "@talismn/util"
import BigNumber from "bignumber.js"
import { parseUserInputToPlanck } from "../swap-utils"
import {
  type ExchangeParams,
  getTokenIdForSwappableAsset,
  type PageSwapEnv,
  type PageSwapModule,
  platformFromTokenId,
  type SwapBuildLegParams,
  type SwapExchange,
  type SwappableAssetBaseType,
} from "./common.swap-module"
import {
  buildDepositTransaction,
  type DepositInfo,
  estimateDepositGas,
} from "./deposit-swap-transactions"
import { getSimpleSwapTalismanFee } from "./fee-utils"
import { createSimpleSwapApi, type Exchange } from "./simpleswap-api"
import simpleswapLogo from "./simpleswap-logo.svg?url"

const PROTOCOL: SupportedSwapProtocol = "simpleswap"
const PROTOCOL_NAME = "SimpleSwap"
const DECENTRALISATION_SCORE = 1

const LOGO = simpleswapLogo

type SimpleSwapAssetContext = {
  symbol: string
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

const getSimpleswapAssets = async (
  env: PageSwapEnv,
  _signal: AbortSignal
): Promise<SimpleswapInternalAsset[]> => {
  if (!cachedAssetsPromise) {
    cachedAssetsPromise = fetchSimpleswapAssets(env).catch((err) => {
      cachedAssetsPromise = null // clear on failure so retries work
      throw err
    })
  }
  return cachedAssetsPromise
}

const fetchSimpleswapAssets = async (env: PageSwapEnv): Promise<SimpleswapInternalAsset[]> => {
  const simpleSwapSdk = createSimpleSwapApi(env)
  const [allCurrencies, { simpleswap: mappings }, knownEvmNetworks, knownTokens] =
    await Promise.all([
      simpleSwapSdk.getAllCurrencies(),
      env.getSwapsConfig(),
      env.getNetworksMap("ethereum"),
      env.getTokensMap(),
    ])
  const { networks, tokens } = mappings

  const supportedTokens = allCurrencies.filter((currency) => {
    if (currency.isFiat) return false
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
        const id = networkId
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
        const chainId = networkId ?? parsed?.networkId
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

const getPairs = async (env: PageSwapEnv, fromTokenId: string | null) => {
  const fromAsset = fromTokenId ? resolveAsset(fromTokenId) : null
  const { symbol } = fromAsset?.context?.simpleswap ?? {}
  if (!symbol) return [] // not supported

  const pairs = await createSimpleSwapApi(env).getPairs({ symbol, fixed: false })
  if (!pairs || !Array.isArray(pairs)) return []

  return pairs
}

const getFromAssets = async (env: PageSwapEnv, signal: AbortSignal): Promise<string[]> => {
  const assets = await getSimpleswapAssets(env, signal)
  return assets.map((a) => a.id)
}

const getToAssets = async (
  fromTokenId: string | null,
  env: PageSwapEnv,
  signal: AbortSignal
): Promise<string[]> => {
  const allAssets = await getSimpleswapAssets(env, signal)
  if (!fromTokenId) return allAssets.map((a) => a.id)

  const pairs = await getPairs(env, fromTokenId)
  if (!pairs || !Array.isArray(pairs)) return []

  const validDestinations = new Set(pairs.map(pairKeyFromPair))
  const validDestAssets = allAssets.filter((asset) =>
    validDestinations.has(asset.context.simpleswap?.symbol.toLowerCase())
  )

  return [fromTokenId, ...validDestAssets.map((a) => a.id)]
}

const getQuote = async (
  params: QuoteParams,
  env: PageSwapEnv,
  _signal: AbortSignal
): Promise<BaseQuote | null> => {
  const { fromTokenId, toTokenId, fromAmount, fromAddress, toAddress } = params
  if (!fromTokenId || !toTokenId) return null

  const fromAsset = resolveAsset(fromTokenId)
  const toAsset = resolveAsset(toTokenId)
  if (!fromAsset || !toAsset || !fromAmount || fromAmount === 0n) return null
  const currencyFrom = fromAsset.context.simpleswap?.symbol
  const currencyTo = toAsset.context.simpleswap?.symbol
  if (!currencyFrom || !currencyTo) return null

  const fromAmountHuman = planckToTokens(fromAmount.toString(), fromAsset.decimals) ?? "0"

  const simpleSwapSdk = createSimpleSwapApi(env)
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
  const talismanFee = await getSimpleSwapTalismanFee(
    { currencyFrom, currencyTo },
    env.getSwapsConfig
  )

  // swaps take about 5mins according to their faq: https://simpleswap.io/faq#crypto-to-crypto-exchanges--how-long-does-it-take-to-exchange-coins
  const quote = (outputAmount: bigint, fees: QuoteFee[], error?: string) =>
    quoteFromLegs(
      [
        {
          protocol: PROTOCOL,
          fromTokenId,
          toTokenId,
          signer: fromAddress,
          recipient: toAddress,
          inputAmount: fromAmount,
          outputAmount,
          fees,
          timeInSec: 5 * 60,
        },
      ],
      {
        decentralisationScore: DECENTRALISATION_SCORE,
        protocol: PROTOCOL,
        error,
        providerLogo: LOGO,
        providerName: PROTOCOL_NAME,
        talismanFee,
      }
    )

  // check for error object
  if (!output || typeof output !== "string")
    return output && typeof output !== "string" ? quote(0n, [], output.description) : null

  const gasFee = fromAddress ? await estimateDepositGas(env, fromAsset, fromAddress) : null
  // add talisman fee
  const fees: QuoteFee[] = (gasFee ? [gasFee] : []).concat({
    amount: BigNumber(fromAmount.toString())
      .times(10 ** -fromAsset.decimals)
      .times(talismanFee),
    name: TALISMAN_FEE_NAME,
    tokenId: fromAsset.id,
  })

  return quote(parseUserInputToPlanck(output, toAsset.decimals), fees)
}

/** @knipignore Used by swap-protocols.ts via dynamic import type to avoid circular deps. */
export type SimpleswapExchange = Exchange

const createExchange = async (params: ExchangeParams, env: PageSwapEnv): Promise<SwapExchange> => {
  try {
    const { fromTokenId, toTokenId, fromAmount, fromAddress, toAddress } = params

    const fromAsset = resolveAsset(fromTokenId)
    const toAsset = resolveAsset(toTokenId)

    const substrateChains = await env.getNetworks("polkadot")
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

    const allAccounts = await env.getAccounts()

    const formattedFromAddress = formatAddress(fromAddress, fromAsset)
    const formattedToAddress = formatAddress(toAddress, toAsset)
    if (!formattedFromAddress) throw new Error("Missing from address")
    if (!formattedToAddress) throw new Error("Missing to address")

    const currency_from = fromAsset.context?.simpleswap?.symbol as string
    const currency_to = toAsset.context?.simpleswap?.symbol as string
    if (!currency_from) throw new Error("Missing currency from")
    if (!currency_to) throw new Error("Missing currency to")

    const allNetworks = await env.getNetworks()

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

    const exchange = await createSimpleSwapApi(env).createExchange({
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
      log.warn(
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
    log.error(new Error("Failed to create exchange", { cause }))
    throw cause
  }
}

const buildLeg = async (
  { leg, input, context, exchange }: SwapBuildLegParams,
  env: PageSwapEnv
): Promise<BuiltLeg> => {
  const fromAsset = resolveAsset(leg.fromTokenId)
  if (!fromAsset) throw new Error("Missing from asset")

  if (exchange?.protocol !== "simpleswap" || !exchange.data.address_from)
    throw new Error("Missing exchange")
  if (!leg.signer) throw new Error("Missing from address")
  if (!leg.recipient) throw new Error("Missing to address")

  assertDepositAmountWithinInput({
    depositAmount: exchange.data.expected_amount,
    fromAmount: input,
    decimals: fromAsset.decimals,
  })

  const deposit: DepositInfo = {
    depositAddress: exchange.data.address_from,
    depositAmount: exchange.data.expected_amount,
  }

  return {
    transaction: await buildDepositTransaction(env, {
      fromAsset,
      fromAddress: leg.signer,
      deposit,
      context,
    }),
    fees: leg.fees,
    expectedOutput: leg.outputAmount,
    txInfo: {
      type: "swap-simpleswap",
      exchangeId: exchange.data.id,
      fromTokenId: leg.fromTokenId,
      toTokenId: leg.toTokenId,
      fromAmount: input.toString(),
      toAmount: leg.outputAmount.toString(),
      to: leg.recipient,
    },
  }
}

export const simpleswapSwapModule: PageSwapModule = {
  protocol: PROTOCOL,
  decentralisationScore: DECENTRALISATION_SCORE,
  getFromAssets: getFromAssets,
  getToAssets: getToAssets,
  getQuote: getQuote,
  createExchange,
  buildLeg,
}
