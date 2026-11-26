import { CHAINFLIP_COMMISSION_BPS, chainflipChannelId, getChainflipApiKey } from "@common/chainflip"
import { UNKNOWN_TOKEN_URL } from "@common/constants"
import { log } from "@common/log"
import { subAssetTokenId, type TokenId } from "@talismn/chaindata-provider"
import { encodeAnyAddress } from "@talismn/crypto"
import { planckToTokens } from "@talismn/util"
import BigNumber from "bignumber.js"
import chainflipLogo from "./chainflip-logo.svg?url"
import {
  type BaseQuote,
  type BuiltLeg,
  type ExchangeParams,
  getTokenIdForSwappableAsset,
  platformFromTokenId,
  type QuoteFee,
  type QuoteParams,
  type SupportedSwapProtocol,
  type SwapBuildLegParams,
  type SwapEnv,
  type SwapExchange,
  type SwapModuleDefinition,
  type SwappableAssetBaseType,
} from "./common.swap-module"
import {
  buildDepositTransaction,
  type DepositInfo,
  estimateDepositGas,
} from "./deposit-swap-transactions"
import { quoteFromLegs } from "./helpers"
import { assertDepositAmountWithinInput } from "./provider-transaction-guards"

// --- API types (GET /assets) ---

type ChainflipAssetDirection = "ingress" | "egress" | "both"

type ChainflipAsset = {
  id: string
  ticker: string
  name: string
  network: string
  /** Absent for native assets. For Assethub this is an asset id (1337, 1984), not an address. */
  contractAddress?: string
  decimals: number
  direction: ChainflipAssetDirection
  enabled: boolean
  assetLogo: string
  /** Human decimal. Absent when the provider enrichment times out. */
  minimalAmount?: number
  minimalAmountNative?: string
}

type ChainflipAssetsResponse = {
  assets: ChainflipAsset[]
}

// --- API types (GET /quotes) ---

type ChainflipQuoteFee = {
  type: "ingress" | "network" | "broker" | "egress" | "liquidity" | "boost" | "refund"
  /** A Chainflip asset id, e.g. "usdc.eth" */
  asset: string
  amount: number
  amountNative: string
}

type ChainflipQuote = {
  type: "regular" | "dca"
  ingressAsset: string
  ingressAmount: number
  ingressAmountNative: string
  egressAsset: string
  egressAmount: number
  egressAmountNative: string
  intermediateAmount?: number
  intermediateAmountNative?: string
  includedFees: ChainflipQuoteFee[]
  /** The total, already summed. Not to be confused with estimatedDurationsSeconds. */
  estimatedDurationSeconds: number
  estimatedPrice: number
  recommendedSlippageTolerancePercent: number
  /** How long the channel keeps retrying a swap below the minimum price before refunding. */
  recommendedRetryDurationInBlocks?: number | null
  lowLiquidityWarning: boolean
  /** Set on a "dca" quote, null on a regular one: how the swap is split, echoed onto the channel. */
  numberOfChunks?: number | null
  chunkIntervalBlocks?: number | null
}

/**
 * The DCA quote when Chainflip offers one, otherwise the regular quote. DCA splits the swap into
 * chunks for a better fill, and the user swaps through it the same way — the split is carried on
 * the deposit channel, not chosen in the UI.
 */
const pickQuote = (quotes: ChainflipQuote[]): ChainflipQuote | undefined =>
  quotes.find(({ type }) => type === "dca") ?? quotes.find(({ type }) => type === "regular")

/** RFC7807 ProblemDetails, as returned by every error path on the API. */
type ChainflipProblemDetails = {
  title?: string
  detail?: string
  status?: number
  errors?: Record<string, string[]>
}

// --- Network mapping ---

// The API returns network display names. Bitcoin and Tron are intentionally absent:
// Talisman's NetworkPlatform is ethereum | polkadot | solana, so their assets cannot be
// represented as a TokenId, and advertising them would produce a quote that fails at execution.
const NETWORK_TO_TALISMAN: Record<
  string,
  { networkId: string; platform: "ethereum" | "polkadot" | "solana" }
> = {
  Ethereum: { networkId: "1", platform: "ethereum" },
  Arbitrum: { networkId: "42161", platform: "ethereum" },
  Bsc: { networkId: "56", platform: "ethereum" },
  Solana: { networkId: "solana-mainnet", platform: "solana" },
  Assethub: { networkId: "polkadot-asset-hub", platform: "polkadot" },
}

export type ChainflipAssetContext = {
  /** The Chainflip asset id, e.g. "usdc.eth" — what /quotes and /swap take. */
  assetId: string
  /** The Chainflip network display name, e.g. "Ethereum". Echoed back verbatim when polling status. */
  network: string
  direction: ChainflipAssetDirection
  /** Human decimal minimum, when the API knows it. */
  minimalAmount?: number
  minimalAmountNative?: string
}

type ChainflipInternalAsset = SwappableAssetBaseType<{
  chainflip: ChainflipAssetContext
}> & {
  decimals: number
}

// --- Module identity ---

const apiUrl = "https://chainflip-broker.io"

const PROTOCOL: SupportedSwapProtocol = "chainflip"
const PROTOCOL_NAME = "Chainflip"
// Above a custodial CEX (funds move through a permissionless validator set, no bridge and no
// wrapped IOU in the settlement path), below a pure DEX (the quote and the channel-opening call
// go through a centralised API). Proposed, for Talisman to set.
const DECENTRALISATION_SCORE = 1.75
const LOGO = chainflipLogo

// --- Internal lookup caches ---

const assetsByTokenId = new Map<TokenId, ChainflipInternalAsset>()
const assetsByChainflipId = new Map<string, ChainflipInternalAsset>()

export const resolveChainflipAsset = (tokenId: TokenId): ChainflipInternalAsset | undefined =>
  assetsByTokenId.get(tokenId)

// --- Cached assets (promise-based to deduplicate concurrent calls) ---

let cachedAssetsPromise: Promise<ChainflipInternalAsset[]> | null = null

// The signal is deliberately ignored: the promise is shared between concurrent callers,
// so one aborted quote must not poison the cache for the others.
const getChainflipAssets = async (
  env: SwapEnv,
  _signal: AbortSignal
): Promise<ChainflipInternalAsset[]> => {
  if (!cachedAssetsPromise) {
    cachedAssetsPromise = fetchChainflipAssets(env).catch((err) => {
      cachedAssetsPromise = null // clear on failure so retries work
      throw err
    })
  }
  return cachedAssetsPromise
}

/** Build the Talisman TokenId for a Chainflip asset, or null if it cannot be represented. */
const tokenIdForAsset = (asset: ChainflipAsset): TokenId | null => {
  const network = NETWORK_TO_TALISMAN[asset.network]
  if (!network) return null // Bitcoin, Tron, or a network we do not map yet

  const { networkId, platform } = network

  // Assethub USDC/USDT are substrate-assets tokens. getTokenIdForSwappableAsset's substrate
  // branch returns the native token id and discards contractAddress, which would silently map
  // both stablecoins onto DOT.
  if (platform === "polkadot" && asset.contractAddress)
    return subAssetTokenId(networkId, asset.contractAddress)

  // evmErc20TokenId lowercases the contract address; solSplTokenId does not, and base58 mint
  // addresses are case-sensitive. Both are handled inside the helper — do not normalize here.
  const tokenId = getTokenIdForSwappableAsset(platform, networkId, asset.contractAddress)
  return tokenId === "not-supported" ? null : tokenId
}

const fetchChainflipAssets = async (env: SwapEnv): Promise<ChainflipInternalAsset[]> => {
  const [res, knownTokens] = await Promise.all([env.fetch(`${apiUrl}/assets`), env.getTokensMap()])
  if (!res.ok) throw new Error(`Failed to fetch Chainflip assets: ${res.status}`)

  const { assets } = (await res.json()) as ChainflipAssetsResponse

  const result: ChainflipInternalAsset[] = []
  const unknownTokenIds: string[] = []

  for (const asset of assets) {
    if (!asset.enabled) continue

    const id = tokenIdForAsset(asset)
    if (!id) continue

    // token-filtering.ts drops tokenIds that chaindata does not know, silently. Do the same
    // here so a missing token shrinks our asset list instead of advertising a dead route.
    const token = knownTokens[id]
    if (!token) {
      unknownTokenIds.push(`${asset.id} -> ${id}`)
      continue
    }

    const { networkId, platform } = NETWORK_TO_TALISMAN[asset.network]

    result.push({
      id,
      name: token.name ?? asset.name,
      symbol: token.symbol ?? asset.ticker,
      decimals: token.decimals ?? asset.decimals,
      chainId: networkId,
      contractAddress: platform === "polkadot" ? undefined : asset.contractAddress,
      assetHubAssetId: platform === "polkadot" ? asset.contractAddress : undefined,
      image:
        (token.logo !== UNKNOWN_TOKEN_URL ? token.logo : undefined) ??
        `${apiUrl}${asset.assetLogo}`,
      platform: platformFromTokenId(id),
      context: {
        chainflip: {
          assetId: asset.id,
          network: asset.network,
          direction: asset.direction,
          minimalAmount: asset.minimalAmount,
          minimalAmountNative: asset.minimalAmountNative,
        },
      },
    })
  }

  if (unknownTokenIds.length)
    log.warn("[Chainflip] assets missing from chaindata, skipped:", unknownTokenIds)

  // Populate the lookup caches
  assetsByTokenId.clear()
  assetsByChainflipId.clear()
  for (const asset of result) {
    assetsByTokenId.set(asset.id, asset)
    assetsByChainflipId.set(asset.context.chainflip.assetId, asset)
  }

  return result
}

const getFromAssets = async (env: SwapEnv, signal: AbortSignal): Promise<TokenId[]> => {
  const assets = await getChainflipAssets(env, signal)
  return assets
    .filter(({ context }) => context.chainflip.direction !== "egress")
    .map(({ id }) => id)
}

const getToAssets = async (
  fromTokenId: TokenId | null,
  env: SwapEnv,
  signal: AbortSignal
): Promise<TokenId[]> => {
  const assets = await getChainflipAssets(env, signal)
  // Any supported source routes to any supported destination — there is no pairs endpoint to
  // call. Only the selected source is excluded from its own destination list.
  return assets
    .filter(({ context }) => context.chainflip.direction !== "ingress")
    .filter(({ id }) => id !== fromTokenId)
    .map(({ id }) => id)
}

// --- Quotes ---

/** Turn a non-ok response into the most useful message the API gave us. */
const errorFromResponse = async (
  res: Response,
  fromAsset: ChainflipInternalAsset
): Promise<Error> => {
  let problem: ChainflipProblemDetails | null = null
  try {
    problem = (await res.json()) as ChainflipProblemDetails
  } catch {
    // not JSON — fall through to the status code
  }

  // Below-minimum comes back as a 400 with the minimum in the validation errors.
  const minimum = problem?.errors?.minimalAmount?.[0]
  if (minimum) return new Error(`Chainflip minimum is ${minimum} ${fromAsset.symbol}`)

  return new Error(problem?.detail ?? problem?.title ?? `Chainflip quote failed (${res.status})`)
}

/** The fee lines the user actually pays on top of the quoted output. */
const feesFromQuote = (quote: ChainflipQuote, gasFee: QuoteFee | null): QuoteFee[] => {
  const fees: QuoteFee[] = gasFee ? [gasFee] : []

  // Only the broker line. The ingress/egress/network/liquidity/boost fees are already netted
  // out of egressAmount, so reporting them here would penalise the quote twice under the
  // `cheapest` sort, which sums `fees` against an output that has already paid them.
  const broker = quote.includedFees.find(({ type }) => type === "broker")
  const brokerAsset = broker ? assetsByChainflipId.get(broker.asset) : undefined
  if (broker && brokerAsset)
    fees.push({
      name: "Broker Fee",
      amount: BigNumber(broker.amount),
      tokenId: brokerAsset.id,
    })

  return fees
}

const getQuote = async (
  params: QuoteParams,
  env: SwapEnv,
  signal: AbortSignal
): Promise<BaseQuote | null> => {
  const { fromTokenId, toTokenId, fromAmount, fromAddress, toAddress } = params
  if (!fromTokenId || !toTokenId || !fromAmount || fromAmount === 0n) return null

  await getChainflipAssets(env, signal)
  const fromAsset = resolveChainflipAsset(fromTokenId)
  const toAsset = resolveChainflipAsset(toTokenId)
  if (!fromAsset || !toAsset) return null

  const { minimalAmount, minimalAmountNative } = fromAsset.context.chainflip

  // Pre-flight the minimum in native units, so the user sees a readable number before the
  // confirm screen. When the API did not return one, the 400 below is the guard.
  if (minimalAmountNative && fromAmount < BigInt(minimalAmountNative)) {
    const readable = minimalAmount ?? planckToTokens(minimalAmountNative, fromAsset.decimals) ?? "0"
    throw new Error(`Chainflip minimum is ${readable} ${fromAsset.symbol}`)
  }

  const url = new URL(`${apiUrl}/quotes`)
  url.searchParams.set("apiKey", getChainflipApiKey())
  url.searchParams.set("sourceAsset", fromAsset.context.chainflip.assetId)
  url.searchParams.set("destinationAsset", toAsset.context.chainflip.assetId)
  // Human decimal, not native units.
  url.searchParams.set("amount", planckToTokens(fromAmount.toString(), fromAsset.decimals) ?? "0")
  // Sent, not omitted: the billed rate is max(configured, sent) + 5 bps, and the credential is
  // configured at 0, so omitting this would earn no commission at all.
  url.searchParams.set("commissionBps", CHAINFLIP_COMMISSION_BPS.toString())

  const res = await env.fetch(url, { signal })
  if (!res.ok) throw await errorFromResponse(res, fromAsset)

  const quote = pickQuote((await res.json()) as ChainflipQuote[])
  if (!quote) return null

  const gasFee = fromAddress ? await estimateDepositGas(env, fromAsset, fromAddress) : null
  const fees = feesFromQuote(quote, gasFee)

  // Disclosed rate, derived from the quote rather than printed from a constant, so it cannot
  // drift when the dashboard rate changes.
  const broker = quote.includedFees.find(({ type }) => type === "broker")
  const talismanFee =
    broker && quote.ingressAmount ? broker.amount / quote.ingressAmount : undefined

  return quoteFromLegs(
    [
      {
        protocol: PROTOCOL,
        fromTokenId,
        toTokenId,
        signer: fromAddress,
        recipient: toAddress,
        inputAmount: fromAmount,
        // Native-unit strings. BigInt() on a human decimal such as "122.94" throws a SyntaxError.
        outputAmount: BigInt(quote.egressAmountNative),
        fees,
        // The singular field is already the total; estimatedDurationsSeconds is a breakdown of it.
        timeInSec: Math.round(quote.estimatedDurationSeconds),
      },
    ],
    {
      decentralisationScore: DECENTRALISATION_SCORE,
      protocol: PROTOCOL,
      providerLogo: LOGO,
      providerName: PROTOCOL_NAME,
      talismanFee,
    }
  )
}

// --- Deposit channels ---

/** The /swap response. A deposit channel, open on-chain the moment it is returned. */
type ChainflipDepositChannel = {
  /** Nullable server-side: stamped only once the swap row saves. Never poll by it. */
  id?: number
  address: string
  issuedBlock: number
  /** Display name, e.g. "Ethereum". Echo it back verbatim when polling status. */
  network: string
  channelId: number
  sourceExpiryBlock: number
  explorerUrl: string
  channelOpeningFee: number
  channelOpeningFeeNative: string
}

/** Referenced by swap-protocols.ts via dynamic import type, to avoid a circular dependency. */
export type ChainflipExchange = {
  /**
   * The deposit channel key, "{issuedBlock}-{network}-{channelId}". Named `id` to match the
   * other deposit-address providers, so it flows into txInfo as exchangeId untouched — and
   * unlike Chainflip's own swap id, it is never null.
   */
  id: string
  /** The address to send the funds to. */
  address: string
  /**
   * Human-decimal amount to send to the channel. /swap takes no amount — the channel accepts
   * whatever arrives — so the quoted ingress amount is carried here for buildLeg.
   */
  depositAmount: string
  sourceExpiryBlock: number
}

/** Substrate addresses go on the wire in the source chain's own ss58 format. */
const formatAddress = async (env: SwapEnv, address: string, asset: ChainflipInternalAsset) => {
  if (asset.platform !== "polkadot") return address

  const substrateChains = await env.getNetworks("polkadot")
  const chain = substrateChains.find((c) => c.id.toString() === asset.chainId.toString())
  return chain ? encodeAnyAddress(address, { ss58Format: chain.prefix }) : address
}

/** Fresh quote for the slippage guard and the DCA split: the one the user saw may be 20s old. */
const fetchFreshQuote = async (
  env: SwapEnv,
  fromAsset: ChainflipInternalAsset,
  toAsset: ChainflipInternalAsset,
  fromAmount: bigint
): Promise<ChainflipQuote> => {
  const url = new URL(`${apiUrl}/quotes`)
  url.searchParams.set("apiKey", getChainflipApiKey())
  url.searchParams.set("sourceAsset", fromAsset.context.chainflip.assetId)
  url.searchParams.set("destinationAsset", toAsset.context.chainflip.assetId)
  url.searchParams.set("amount", planckToTokens(fromAmount.toString(), fromAsset.decimals) ?? "0")
  url.searchParams.set("commissionBps", CHAINFLIP_COMMISSION_BPS.toString())

  const res = await env.fetch(url)
  if (!res.ok) throw await errorFromResponse(res, fromAsset)

  const quote = pickQuote((await res.json()) as ChainflipQuote[])
  if (!quote) throw new Error("Chainflip has no route for this pair")

  return quote
}

const createExchange = async (params: ExchangeParams, env: SwapEnv): Promise<SwapExchange> => {
  const { fromTokenId, toTokenId, fromAmount, fromAddress, toAddress } = params

  await getChainflipAssets(env, new AbortController().signal)
  const fromAsset = resolveChainflipAsset(fromTokenId)
  const toAsset = resolveChainflipAsset(toTokenId)
  if (!fromAsset) throw new Error("Missing from asset")
  if (!toAsset) throw new Error("Missing to asset")

  // The refund address is validated against the source asset, the destination against the target.
  if (!fromAddress) throw new Error("Missing from address")
  if (!toAddress) throw new Error("Missing to address")
  const refundAddress = await formatAddress(env, fromAddress, fromAsset)
  const destinationAddress = await formatAddress(env, toAddress, toAsset)

  const quote = await fetchFreshQuote(env, fromAsset, toAsset, fromAmount)
  const { estimatedPrice } = quote
  // Read here rather than from buildLeg's slippage: the price guard is fixed when the channel
  // opens, which happens before the leg is built.
  const slippage = await env.getSlippageDecimal()
  const minimumPrice = BigNumber(estimatedPrice).times(1 - slippage)
  // minimumPrice binds as a required decimal, and 0 means "accept any price". A NaN or an
  // Infinity must never reach the wire.
  if (!minimumPrice.isFinite() || minimumPrice.isNegative())
    throw new Error("Could not compute a minimum price for this swap")

  const url = new URL(`${apiUrl}/swap`)
  url.searchParams.set("apiKey", getChainflipApiKey())
  url.searchParams.set("sourceAsset", fromAsset.context.chainflip.assetId)
  url.searchParams.set("destinationAsset", toAsset.context.chainflip.assetId)
  url.searchParams.set("destinationAddress", destinationAddress)
  url.searchParams.set("refundAddress", refundAddress)
  url.searchParams.set(
    "minimumPrice",
    minimumPrice.decimalPlaces(18, BigNumber.ROUND_DOWN).toFixed()
  )
  // Chainflip's own recommendation for this route. The field is optional, so fall back to 150
  // blocks (6s each, 15 minutes) rather than refuse the swap.
  const retryDurationInBlocks = quote.recommendedRetryDurationInBlocks ?? 150
  url.searchParams.set("retryDurationInBlocks", retryDurationInBlocks.toString())
  // Sent here as well as on /quotes: the channel is what actually earns the commission.
  url.searchParams.set("commissionBps", CHAINFLIP_COMMISSION_BPS.toString())
  // A DCA quote only holds if the channel splits the swap the same way.
  if (quote.type === "dca") {
    if (!quote.numberOfChunks || !quote.chunkIntervalBlocks)
      throw new Error("Chainflip returned a DCA quote without its chunking")
    url.searchParams.set("numberOfChunks", quote.numberOfChunks.toString())
    url.searchParams.set("chunkIntervalBlocks", quote.chunkIntervalBlocks.toString())
  }

  const res = await env.fetch(url)
  // Provider health is per-feature, so a good quote says nothing about channel availability.
  if (res.status === 503)
    throw new Error("Chainflip cannot open a deposit channel right now. Please try again later")
  if (!res.ok) throw await errorFromResponse(res, fromAsset)

  const channel = (await res.json()) as ChainflipDepositChannel
  if (!channel.address) throw new Error("No deposit address returned. Please try again later")
  if (channel.network !== fromAsset.context.chainflip.network)
    throw new Error("Deposit channel opened on the wrong network. Please try again later")

  return {
    protocol: "chainflip",
    data: {
      id: chainflipChannelId(channel),
      address: channel.address,
      depositAmount: planckToTokens(fromAmount.toString(), fromAsset.decimals) ?? "0",
      sourceExpiryBlock: channel.sourceExpiryBlock,
    },
  }
}

const buildLeg = async (
  { leg, input, context, exchange }: SwapBuildLegParams,
  env: SwapEnv
): Promise<BuiltLeg> => {
  // The cache can be cold here: the background worker may have restarted between confirming
  // the swap and signing it.
  await getChainflipAssets(env, new AbortController().signal)
  const fromAsset = resolveChainflipAsset(leg.fromTokenId)
  if (!fromAsset) throw new Error("Missing from asset")

  if (exchange?.protocol !== "chainflip" || !exchange.data.address)
    throw new Error("Missing exchange")
  if (!leg.signer) throw new Error("Missing from address")
  if (!leg.recipient) throw new Error("Missing to address")

  assertDepositAmountWithinInput({
    depositAmount: exchange.data.depositAmount,
    fromAmount: input,
    decimals: fromAsset.decimals,
  })

  const deposit: DepositInfo = {
    depositAddress: exchange.data.address,
    depositAmount: exchange.data.depositAmount,
  }

  // A deposit channel is funded by a plain transfer from the user's own account, so there is no
  // ERC-20 approval anywhere in this flow and no getApprovalInfo on this module.
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
      type: "swap-chainflip",
      // The deposit channel key, not a swap id — see @common/chainflip
      exchangeId: exchange.data.id,
      fromTokenId: leg.fromTokenId,
      toTokenId: leg.toTokenId,
      fromAmount: input.toString(),
      toAmount: leg.outputAmount.toString(),
      to: leg.recipient,
    },
  }
}

export const chainflipSwapModule: SwapModuleDefinition = {
  protocol: PROTOCOL,
  decentralisationScore: DECENTRALISATION_SCORE,
  supportsSlippageSetting: true,
  getFromAssets,
  getToAssets,
  getQuote,
  createExchange,
  buildLeg,
}
