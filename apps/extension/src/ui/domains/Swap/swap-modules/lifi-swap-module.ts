import { log } from "@common/log"
import { remoteConfigStore } from "@core/domains/app/store.remoteConfig"
import {
  assertNativeValueWithinInput,
  prepareTransactionRequestWithGasCheck,
} from "@core/domains/swaps/exports"
import { quoteFromLegs, TALISMAN_FEE_NAME } from "@core/domains/swaps/helpers"
import { LIFI_API_URL } from "@core/domains/swaps/modules/lifi"
import type {
  ApprovalInfo,
  ApprovalParams,
  BaseQuote,
  BuildLegParams,
  BuiltLeg,
  QuoteFee,
  QuoteLeg,
  QuoteParams,
  SupportedSwapProtocol,
  SwapModuleTransaction,
  SwapTransactionContext,
} from "@core/domains/swaps/types"
import * as lifiSdk from "@lifi/sdk"
import type {
  EvmErc20Token,
  SolNetworkId,
  SolSplToken,
  SolToken2022Token,
} from "@talismn/chaindata-provider"
import {
  evmErc20TokenId,
  evmNativeTokenId,
  isTokenCustom,
  parseTokenId,
  solNativeTokenId,
  solSplTokenId,
  solToken2022TokenId,
  type TokenId,
  type TokenList,
} from "@talismn/chaindata-provider"
import {
  parseTransactionInfo,
  setTransactionBlockhash,
  transactionFromBytes,
} from "@talismn/solana"
import { isAbortError } from "@talismn/util"
import { getNetworksMapById$, getToken$, getTokensMap$ } from "@ui/state/chaindata"
import { getGandalfAuthorization } from "@ui/util/gandalfFetch"
import BigNumber from "bignumber.js"
import { firstValueFrom } from "rxjs"
import { zeroAddress } from "viem"
import { getSwapSlippageDecimal } from "../hooks/useSwapSlippage"
import { getTokenIdForSwappableAsset, type SwapModule } from "./common.swap-module"
import { findEvmPublicClient } from "./evm-network"
import { getLifiTalismanFee as getTalismanFee, LIFI_PROTOCOL_FEE as LIFI_FEE } from "./fee-utils"

const PROTOCOL: SupportedSwapProtocol = "lifi" as const
const PROTOCOL_NAME = "LI.FI"
const DECENTRALISATION_SCORE = 2

const SOLANA_NETWORK_ID: SolNetworkId = "solana-mainnet"

// Solana protocol constants for native SOL representations used by LI.FI.
// System program (native SOL) and wSOL mint — these are protocol-level and will never change.
const SOLANA_NATIVE_TOKEN_ADDRESS = "11111111111111111111111111111111"
const SOLANA_NATIVE_ADDRESSES = new Set([
  SOLANA_NATIVE_TOKEN_ADDRESS,
  "So11111111111111111111111111111111111111112",
])

// quoted in place of an account the user has not chosen yet
const SWAP_PLACEHOLDER_ADDRESS = "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a"
const SOLANA_PLACEHOLDER_ADDRESS = "11111111111111111111111111111111"
const PLACEHOLDER_ADDRESSES = new Set([SWAP_PLACEHOLDER_ADDRESS, SOLANA_PLACEHOLDER_ADDRESS])

const MAX_PLAN_STEPS = 3

type RouteRequest = {
  /** the quote list takes a route of several steps as a plan, a leg rebuild takes one step only */
  multiStep: boolean
  /** false for a later leg of a plan: leg 0 collected the fee for the whole swap */
  chargesTalismanFee: boolean
}

/** `data` of a leg: its step as a route of its own, so every leg is built and approved the same way */
type LifiLegRoute = lifiSdk.Route & { stepIndex: number; stepCount: number }

const getKnownSolanaTokenId = (
  mintAddress: string,
  knownTokens: TokenList,
  preferredTokenIds = new Set<string>()
) => {
  if (SOLANA_NATIVE_ADDRESSES.has(mintAddress)) return solNativeTokenId(SOLANA_NETWORK_ID)

  const tokenIds = [
    solSplTokenId(SOLANA_NETWORK_ID, mintAddress),
    solToken2022TokenId(SOLANA_NETWORK_ID, mintAddress),
  ]

  return (
    tokenIds.find((tokenId) => preferredTokenIds.has(tokenId) && knownTokens[tokenId]) ??
    tokenIds.find((tokenId) => knownTokens[tokenId]) ??
    tokenIds[0]
  )
}

const getLifiSolanaChainId = async () => {
  const { lifi } = await remoteConfigStore.get("swaps")
  return lifi.solanaChainId
}

/** Convert a Talisman chain ID to a LI.FI numeric chain ID. */
const toLifiChainId = async (chainId: string | number): Promise<number> => {
  if (chainId === SOLANA_NETWORK_ID) return getLifiSolanaChainId()
  return +chainId
}

const evmTokenIdOf = (token: { address: string; chainId: number }): TokenId =>
  token.address === zeroAddress
    ? evmNativeTokenId(token.chainId.toString())
    : evmErc20TokenId(token.chainId.toString(), token.address as `0x${string}`)

/** Resolve a LI.FI fee/gas token to a Talisman token ID, handling both EVM and Solana chains. */
const feeTokenId = async (token: { address: string; chainId: number }): Promise<string> => {
  const solanaChainId = await getLifiSolanaChainId()
  if (token.chainId === solanaChainId) {
    const knownSolTokens = await firstValueFrom(getTokensMap$({ platform: "solana" }))
    return getKnownSolanaTokenId(token.address, knownSolTokens)
  }
  return evmTokenIdOf(token)
}

// LI.FI v4 replaced the global `createConfig` side-effect with an explicit client
// instance that must be passed to every action function (getTokens/getToken/getRoutes/…).
// The Talisman proxy requires a Gandalf access token on every request. The SDK
// builds `headers` as a plain object and spreads it again when it retries, so the
// interceptor keeps it a plain object.
const lifiClient = lifiSdk.createClient({
  integrator: "talisman",
  apiUrl: LIFI_API_URL,
  requestInterceptor: async (request) => {
    const authorization = await getGandalfAuthorization()
    if (!authorization) return request
    return {
      ...request,
      headers: { ...(request.headers as Record<string, string>), Authorization: authorization },
    }
  },
})

// --- Internal asset type for LI.FI (not exposed) ---
type LifiInternalAsset = {
  tokenId: string
  chainId: string
  contractAddress?: string
  decimals: number
  symbol: string
  lifiToken: lifiSdk.Token
}

// --- Cached assets (promise-based to deduplicate concurrent calls) ---
let cachedAssetsPromise: Promise<LifiInternalAsset[]> | null = null
const assetsByTokenId = new Map<string, LifiInternalAsset>()

const resolveAsset = (tokenId: string): LifiInternalAsset | undefined =>
  assetsByTokenId.get(tokenId)

const lifiTokenFromErc20 = (token: EvmErc20Token): lifiSdk.Token => ({
  address: token.contractAddress,
  chainId: Number(token.networkId),
  decimals: token.decimals,
  symbol: token.symbol,
  name: token.name ?? token.symbol,
  logoURI: token.logo,
  priceUSD: "0",
})

const lifiAssetFromErc20 = (token: EvmErc20Token): LifiInternalAsset => ({
  tokenId: token.id,
  chainId: token.networkId,
  contractAddress: token.contractAddress,
  decimals: token.decimals,
  symbol: token.symbol,
  lifiToken: lifiTokenFromErc20(token),
})

type SolToken = SolSplToken | SolToken2022Token

const lifiAssetFromSolToken = async (token: SolToken): Promise<LifiInternalAsset> => ({
  tokenId: token.id,
  chainId: SOLANA_NETWORK_ID,
  contractAddress: token.mintAddress,
  decimals: token.decimals,
  symbol: token.symbol,
  lifiToken: {
    address: token.mintAddress,
    chainId: await getLifiSolanaChainId(),
    decimals: token.decimals,
    symbol: token.symbol,
    name: token.name ?? token.symbol,
    logoURI: token.logo,
    priceUSD: "0",
  },
})

const resolveOrBuildAsset = async (tokenId: string): Promise<LifiInternalAsset | null> => {
  const cached = resolveAsset(tokenId)
  if (cached) return cached

  const token = await firstValueFrom(getToken$(tokenId))
  if (token?.type === "evm-erc20") {
    const asset = lifiAssetFromErc20(token as EvmErc20Token)
    assetsByTokenId.set(tokenId, asset)
    return asset
  }
  if (token?.type === "sol-spl" || token?.type === "sol-token2022") {
    const asset = await lifiAssetFromSolToken(token as SolToken)
    assetsByTokenId.set(tokenId, asset)
    return asset
  }

  return null
}

const getLifiAssets = async (_signal: AbortSignal): Promise<LifiInternalAsset[]> => {
  if (!cachedAssetsPromise) {
    cachedAssetsPromise = fetchLifiAssets().catch((err) => {
      cachedAssetsPromise = null // clear on failure so retries work
      throw err
    })
  }
  return cachedAssetsPromise
}

const fetchLifiAssets = async (): Promise<LifiInternalAsset[]> => {
  const [allSdkTokens, swapsConfig] = await Promise.all([
    lifiSdk
      .getTokens(lifiClient, { chainTypes: [lifiSdk.ChainType.EVM, lifiSdk.ChainType.SVM] })
      .then((r) => r?.tokens),
    remoteConfigStore.get("swaps"),
  ])
  const solanaChainId = swapsConfig.lifi.solanaChainId
  const configuredLifiTokenIds = new Set(swapsConfig.lifiTalismanTokens ?? [])

  for (const talismanTokenId of configuredLifiTokenIds) {
    const [chainId, type, contractAddress] = talismanTokenId.split(":")
    if (type !== "evm-erc20" && type !== "sol-spl" && type !== "sol-token2022") continue

    try {
      const lifiChainId =
        type === "sol-spl" || type === "sol-token2022" ? solanaChainId : parseInt(chainId, 10)
      const token = await lifiSdk.getToken(lifiClient, lifiChainId, contractAddress)
      allSdkTokens[token?.chainId]?.push?.(token)
    } catch (cause) {
      log.warn(`Failed to add lifi token ${talismanTokenId}`, cause)
    }
  }

  const [knownEvmNetworks] = await Promise.all([
    firstValueFrom(getNetworksMapById$({ platform: "ethereum" })),
    firstValueFrom(getNetworksMapById$({ platform: "solana" })),
  ])
  const [knownEvmTokens, knownSolTokens] = await Promise.all([
    firstValueFrom(getTokensMap$({ platform: "ethereum" })),
    firstValueFrom(getTokensMap$({ platform: "solana" })),
  ])
  const knownTokens = { ...knownEvmTokens, ...knownSolTokens }

  const result = Object.entries(allSdkTokens)
    .filter(([chainId]) => knownEvmNetworks[chainId] || Number(chainId) === solanaChainId)
    .flatMap(([chainId, tokens]): LifiInternalAsset[] => {
      const isEvmChain = !!knownEvmNetworks[chainId]
      const isSolChain = Number(chainId) === solanaChainId

      return tokens.flatMap((sdkToken) => {
        let id: string
        if (isEvmChain) {
          const contractAddress = sdkToken.address === zeroAddress ? undefined : sdkToken.address
          id = getTokenIdForSwappableAsset("evm", chainId, contractAddress)
        } else if (isSolChain) {
          id = getKnownSolanaTokenId(sdkToken.address, knownTokens, configuredLifiTokenIds)
        } else {
          return []
        }

        const token = knownTokens[id]
        if (!token) return []

        const contractAddress = isEvmChain
          ? sdkToken.address === zeroAddress
            ? undefined
            : sdkToken.address
          : isSolChain && !SOLANA_NATIVE_ADDRESSES.has(sdkToken.address)
            ? sdkToken.address
            : undefined

        return [
          {
            tokenId: id,
            chainId: isSolChain ? SOLANA_NETWORK_ID : chainId,
            contractAddress,
            decimals: token.decimals,
            symbol: token.symbol,
            lifiToken: sdkToken,
          },
        ]
      })
    })

  const lifiEvmChainIds = new Set(Object.keys(allSdkTokens).map((chainId) => Number(chainId)))
  const resultByTokenId = new Map(result.map((asset) => [asset.tokenId, asset]))

  for (const token of Object.values(knownEvmTokens)) {
    if (token.type !== "evm-erc20") continue
    if (!isTokenCustom(token)) continue
    if (!knownEvmNetworks[token.networkId]) continue
    if (!lifiEvmChainIds.has(Number(token.networkId))) continue
    if (resultByTokenId.has(token.id)) continue

    resultByTokenId.set(token.id, lifiAssetFromErc20(token))
  }

  const assets = [...resultByTokenId.values()]

  // Populate the lookup cache
  assetsByTokenId.clear()
  for (const asset of assets) assetsByTokenId.set(asset.tokenId, asset)

  return assets
}

// Include all EVM ERC-20 and Solana SPL/Token2022 tokens on LI.FI-supported chains
// in addition to the standard list. LI.FI can route tokens not in its default list
// when there is on-chain liquidity, allowing users to swap RWA and other niche tokens.
const getLifiAssetIds = async (signal: AbortSignal): Promise<string[]> => {
  const assets = await getLifiAssets(signal)
  const ids = new Set(assets.map((a) => a.tokenId))

  const lifiChainIds = new Set(assets.map((a) => a.chainId))

  const allEvmTokens = await firstValueFrom(getTokensMap$({ platform: "ethereum" }))
  for (const token of Object.values(allEvmTokens)) {
    if (token.type === "evm-erc20" && lifiChainIds.has(token.networkId)) ids.add(token.id)
  }

  if (lifiChainIds.has(SOLANA_NETWORK_ID)) {
    const allSolTokens = await firstValueFrom(getTokensMap$({ platform: "solana" }))
    for (const token of Object.values(allSolTokens)) {
      if (token.type === "sol-spl" || token.type === "sol-token2022") ids.add(token.id)
    }
  }

  return [...ids]
}

const getFromAssets = async (signal: AbortSignal): Promise<string[]> => getLifiAssetIds(signal)

const getToAssets = async (_fromTokenId: string | null, signal: AbortSignal): Promise<string[]> =>
  getLifiAssetIds(signal)

const sameAddress = (a: string | undefined, b: string | undefined) =>
  !!a && !!b && a.toLowerCase() === b.toLowerCase()

/**
 * The tokens a plan holds between the steps, [] for a single step, null when the route cannot run as
 * a plan: each intermediate token is an ERC20 the wallet can watch land, held by `fromAddress` on an
 * EVM network it knows, and only the last step pays `toAddress`.
 */
const intermediateTokenIds = (
  route: lifiSdk.Route,
  { fromAddress, toAddress }: Pick<QuoteParams, "fromAddress" | "toAddress">,
  knownEvmNetworks: Record<string, unknown>
): TokenId[] | null => {
  const { steps } = route
  if (steps.length === 1) return []
  if (steps.length > MAX_PLAN_STEPS) return null
  if (!fromAddress || !toAddress) return null
  if (PLACEHOLDER_ADDRESSES.has(fromAddress) || PLACEHOLDER_ADDRESSES.has(toAddress)) return null

  const last = steps.length - 1
  const tokenIds: TokenId[] = []
  for (const [index, { action }] of steps.entries()) {
    if (!knownEvmNetworks[action.fromChainId] || !knownEvmNetworks[action.toChainId]) return null
    if (!sameAddress(action.fromAddress, fromAddress)) return null
    if (!sameAddress(action.toAddress, index === last ? toAddress : fromAddress)) return null
    if (index === last) break

    const next = steps[index + 1].action.fromToken
    if (action.toToken.address === zeroAddress) return null
    if (next.chainId !== action.toChainId) return null
    if (!sameAddress(next.address, action.toToken.address)) return null
    tokenIds.push(evmTokenIdOf(action.toToken))
  }
  return tokenIds
}

const canRunRoute = async (
  route: lifiSdk.Route,
  params: QuoteParams,
  knownEvmNetworks: Record<string, unknown>,
  request: RouteRequest
): Promise<boolean> => {
  if (!request.multiStep) return route.steps.length === 1
  const intermediates = intermediateTokenIds(route, params, knownEvmNetworks)
  if (!intermediates) return false
  const assets = await Promise.all(intermediates.map(resolveOrBuildAsset))
  return assets.every((asset) => asset !== null)
}

const getRoutes = async (
  params: QuoteParams,
  slippage: number,
  talismanFee: number,
  request: RouteRequest,
  signal?: AbortSignal
): Promise<lifiSdk.RoutesResponse | null> => {
  try {
    const { fromTokenId, toTokenId, fromAmount, fromAddress, toAddress } = params
    if (!fromTokenId || !toTokenId || !fromAmount) return null
    if (signal?.aborted) return null

    // For tokens not in LI.FI's default list, construct the asset
    // from chaindata so the contract address is passed directly to the SDK.
    const [fromAsset, toAsset] = await Promise.all([
      resolveOrBuildAsset(fromTokenId),
      resolveOrBuildAsset(toTokenId),
    ])
    if (!fromAsset || !toAsset) return null

    const solanaChainId = await getLifiSolanaChainId()

    const isSolanaFrom =
      fromAsset.chainId === SOLANA_NETWORK_ID || Number(fromAsset.chainId) === solanaChainId
    const isSolanaTo =
      toAsset.chainId === SOLANA_NETWORK_ID || Number(toAsset.chainId) === solanaChainId

    const effectiveFromAddress =
      fromAddress ?? (isSolanaFrom ? SOLANA_PLACEHOLDER_ADDRESS : SWAP_PLACEHOLDER_ADDRESS)
    const effectiveToAddress =
      toAddress ?? (isSolanaTo ? SOLANA_PLACEHOLDER_ADDRESS : SWAP_PLACEHOLDER_ADDRESS)

    const knownEvmNetworks = await firstValueFrom(getNetworksMapById$({ platform: "ethereum" }))

    if (fromAmount === 0n) return null
    const evmNetwork = knownEvmNetworks[fromAsset.chainId.toString()]
    // network not supported
    if (!evmNetwork && !isSolanaFrom) return null

    // For native tokens, use the canonical "zero" address that each ecosystem expects.
    // EVM uses 0x000...000. Solana uses 111...111 (the System program address).
    // LI.FI treats So11…112 (wSOL) as a DIFFERENT token — if we send wSOL here,
    // LI.FI builds a transaction that assumes the user already owns wSOL and skips
    // the native-SOL wrapping instructions, causing on-chain InvalidAccountData errors.
    const fromTokenAddress = isSolanaFrom
      ? (fromAsset.contractAddress ?? SOLANA_NATIVE_TOKEN_ADDRESS)
      : (fromAsset.contractAddress ?? zeroAddress)
    const toTokenAddress = isSolanaTo
      ? (toAsset.contractAddress ?? SOLANA_NATIVE_TOKEN_ADDRESS)
      : (toAsset.contractAddress ?? zeroAddress)

    const response = await lifiSdk.getRoutes(
      lifiClient,
      {
        fromAddress: effectiveFromAddress,
        toAddress: effectiveToAddress,
        fromChainId: await toLifiChainId(fromAsset.chainId),
        toChainId: await toLifiChainId(toAsset.chainId),
        fromAmount: fromAmount.toString(),
        fromTokenAddress,
        toTokenAddress,
        options: { integrator: "talisman", fee: talismanFee, slippage },
      },
      { signal }
    )

    const runnable = await Promise.all(
      response.routes.map((route) => canRunRoute(route, params, knownEvmNetworks, request))
    )
    response.routes = response.routes.filter((_, index) => runnable[index])

    return response
  } catch (cause) {
    if (signal?.aborted || isAbortError(cause)) return null

    log.warn("Failed to fetch lifi routes", cause)
    return {
      routes: [],
      unavailableRoutes: { failed: [], filteredOut: [] },
    } as lifiSdk.RoutesResponse
  }
}

// Solana assets in this module are stored with `chainId: SOLANA_NETWORK_ID`
// (string), but LI.FI gas tokens use the numeric LI.FI Solana chain ID. We
// need to accept either form to detect Solana-source swaps and to match
// their gas tokens; otherwise `maxNativeTokenGasBuffer` is always 0 for
// Solana.
const isSourceNativeToken = (fromAsset: { chainId: string }, lifiSolanaChainId: number) => {
  const isSolanaFrom =
    fromAsset.chainId === SOLANA_NETWORK_ID ||
    String(fromAsset.chainId) === String(lifiSolanaChainId)

  return (token: { address: string; chainId: number }) => {
    if (isSolanaFrom) {
      return (
        String(token.chainId) === String(lifiSolanaChainId) &&
        SOLANA_NATIVE_ADDRESSES.has(token.address)
      )
    }
    return String(token.chainId) === String(fromAsset.chainId) && token.address === zeroAddress
  }
}

/** Fees the route charges on top of the input, in the source network's native token: they ride in the transaction value */
const getAdditionalNativeFeeWei = (
  step: lifiSdk.LiFiStep,
  fromAsset: { chainId: string },
  lifiSolanaChainId: number
) => {
  const isNativeToken = isSourceNativeToken(fromAsset, lifiSolanaChainId)
  return (step.estimate.feeCosts ?? [])
    .filter((fee) => !fee.included && isNativeToken(fee.token))
    .reduce((total, fee) => total + BigInt(fee.amount), 0n)
}

const stepFees = async (step: lifiSdk.LiFiStep): Promise<QuoteFee[]> => {
  const fees: QuoteFee[] = await Promise.all(
    step.estimate.feeCosts?.map(async (fee) => ({
      amount: BigNumber(fee.amount).times(10 ** -fee.token.decimals),
      name: fee.name,
      tokenId: await feeTokenId(fee.token),
      additional: !fee.included,
    })) ?? []
  )
  for (const gas of step.estimate.gasCosts ?? []) {
    fees.push({
      amount: BigNumber(gas.amount).times(10 ** -gas.token.decimals),
      name: "Gas",
      tokenId: await feeTokenId(gas.token),
    })
  }
  return fees
}

const stepRoute = (
  route: lifiSdk.Route,
  step: lifiSdk.LiFiStep,
  stepIndex: number,
  signer: string | null,
  recipient: string | null
): LifiLegRoute => ({
  ...route,
  fromChainId: step.action.fromChainId,
  fromAmount: step.action.fromAmount,
  fromAmountUSD: step.estimate.fromAmountUSD ?? route.fromAmountUSD,
  fromToken: step.action.fromToken,
  fromAddress: signer ?? route.fromAddress,
  toChainId: step.action.toChainId,
  toAmount: step.estimate.toAmount,
  toAmountMin: step.estimate.toAmountMin,
  toAmountUSD: step.estimate.toAmountUSD ?? route.toAmountUSD,
  toToken: step.action.toToken,
  toAddress: recipient ?? route.toAddress,
  containsSwitchChain: false,
  steps: [step],
  stepIndex,
  stepCount: route.steps.length,
})

const getRouteQuote = async (
  route: lifiSdk.Route,
  {
    fromTokenId,
    toTokenId,
    fromAddress,
    toAddress,
  }: QuoteParams & { fromTokenId: TokenId; toTokenId: TokenId },
  talismanFee: number | null
): Promise<BaseQuote | null> => {
  const [firstStep, ...laterSteps] = route.steps
  if (!firstStep) return null

  const fromAsset = resolveAsset(fromTokenId)
  if (!fromAsset) return null

  const last = route.steps.length - 1
  const stepLeg = async (step: lifiSdk.LiFiStep, index: number): Promise<QuoteLeg> => {
    const recipient = index === last ? toAddress : fromAddress
    return {
      protocol: PROTOCOL,
      fromTokenId: index === 0 ? fromTokenId : evmTokenIdOf(step.action.fromToken),
      toTokenId: index === last ? toTokenId : evmTokenIdOf(step.action.toToken),
      signer: fromAddress,
      recipient,
      inputAmount: BigInt(step.action.fromAmount),
      outputAmount: BigInt(step.estimate.toAmountMin),
      fees: await stepFees(step),
      timeInSec: step.estimate.executionDuration,
      data: stepRoute(route, step, index, fromAddress, recipient),
    }
  }

  const feeRate = Math.round((LIFI_FEE + (talismanFee ?? 0)) * 10_000) / 10_000
  const firstLeg = await stepLeg(firstStep, 0)
  if (talismanFee !== null)
    firstLeg.fees.push({
      amount: BigNumber(firstStep.action.fromAmount)
        .times(10 ** -fromAsset.decimals)
        .times(feeRate),
      name: TALISMAN_FEE_NAME,
      tokenId: fromTokenId,
    })
  const laterLegs = await Promise.all(laterSteps.map((step, index) => stepLeg(step, index + 1)))

  const lifiSolanaChainId = await getLifiSolanaChainId()
  const isNativeGasToken = isSourceNativeToken(fromAsset, lifiSolanaChainId)

  const maxNativeTokenGasBuffer =
    fromAsset.contractAddress === undefined
      ? route.steps
          .flatMap((step) =>
            (step.estimate.gasCosts ?? []).flatMap((gas) =>
              isNativeGasToken(gas.token) ? gas.amount : "0"
            )
          )
          .reduce((a, c) => a.plus(c), BigNumber(0))
          .toString()
      : undefined

  return quoteFromLegs([firstLeg, ...laterLegs], {
    decentralisationScore: DECENTRALISATION_SCORE,
    protocol: PROTOCOL,
    subProtocol: route.steps.map((step) => step.tool).join("+"),
    providerLogo: firstStep.toolDetails.logoURI,
    providerName: firstStep.toolDetails.name,
    talismanFee: feeRate,
    maxNativeTokenGasBuffer: maxNativeTokenGasBuffer,
  })
}

const quoteRoutes = async (
  params: QuoteParams,
  slippage: number,
  request: RouteRequest,
  signal?: AbortSignal
): Promise<BaseQuote[] | null> => {
  const { fromTokenId, toTokenId } = params
  if (!fromTokenId || !toTokenId || signal?.aborted) return null

  const talismanFee = request.chargesTalismanFee
    ? await getTalismanFee({ fromAssetId: fromTokenId, toAssetId: toTokenId })
    : null
  const routes = await getRoutes(params, slippage, talismanFee ?? 0, request, signal)
  if (!routes || signal?.aborted) return null

  const quotes = await Promise.allSettled(
    routes.routes.map((route) =>
      getRouteQuote(route, { ...params, fromTokenId, toTokenId }, talismanFee)
    )
  )
  if (signal?.aborted) return null

  // Filter out nulls and failed promises
  const validQuotes = quotes
    .filter((r): r is PromiseFulfilledResult<BaseQuote | null> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((q): q is BaseQuote => q !== null)
  return validQuotes.length > 0 ? validQuotes : null
}

const getQuote = async (params: QuoteParams, signal: AbortSignal): Promise<BaseQuote[] | null> =>
  quoteRoutes(
    params,
    await getSwapSlippageDecimal(),
    { multiStep: true, chargesTalismanFee: true },
    signal
  )

// if approval is required, returns the contract to approve for, the amount, and token contract
const getApprovalInfo = (params: ApprovalParams): ApprovalInfo => {
  const { fromTokenId, fromAddress, fromAmount, selectedSubProtocol, quoteData } = params
  if (!fromTokenId || !fromAddress || !fromAmount || !quoteData) return null
  const fromToken = parseTokenId(fromTokenId)
  if (fromToken.type !== "evm-erc20") return null

  const quoteItem = Array.isArray(quoteData)
    ? quoteData.find((d) => d?.subProtocol === selectedSubProtocol)
    : quoteData

  const lifiData = quoteItem?.legs[0].data as lifiSdk.Route | undefined
  if (!lifiData) return null

  const step = lifiData.steps[0]
  if (!step?.estimate.approvalAddress) return null

  return {
    contractAddress: step.estimate.approvalAddress,
    // the route echoes back the amount we asked it to quote — approve the amount the user
    // entered instead, so an inflated echo cannot widen the allowance we grant
    amount: fromAmount,
    tokenAddress: fromToken.contractAddress,
    chainId: step.action.fromChainId,
    fromAddress,
    protocolName: PROTOCOL_NAME,
  }
}

const buildRouteTransaction = async (
  step: lifiSdk.LiFiStep,
  fromTokenId: TokenId,
  fromAddress: string,
  fromAmount: bigint,
  context: SwapTransactionContext
): Promise<SwapModuleTransaction> => {
  const fromAsset = resolveAsset(fromTokenId)
  if (!fromAsset) throw new Error("Not supported on Lifi")

  // Fetch fresh transaction calldata from LiFi at confirmation time
  const stepTransaction = await lifiSdk.getStepTransaction(lifiClient, step)
  const txRequest = stepTransaction?.transactionRequest
  if (!txRequest) throw new Error("Unknown error, please try again")

  // Solana transaction handling — txRequest for Solana may omit chainId,
  // so detect via the step's fromChainId instead.
  const lifiSolanaChainId = await getLifiSolanaChainId()
  const isSolanaStep = step.action.fromChainId === lifiSolanaChainId
  if (isSolanaStep) {
    if (!txRequest.data) throw new Error("Missing Solana transaction data")

    // LI.FI may return Solana transactions as base64 or hex-encoded
    const txBytes = txRequest.data.startsWith("0x")
      ? Buffer.from(txRequest.data.slice(2), "hex")
      : Uint8Array.from(atob(txRequest.data), (c) => c.charCodeAt(0))

    let transaction = transactionFromBytes(txBytes)

    // the fee payer is the account we are about to sign with, so a transaction naming
    // anyone else is not the one the user is confirming
    const { feePayer } = parseTransactionInfo(transaction)
    if (feePayer !== fromAddress) throw new Error("Invalid sender address")

    // Refresh the blockhash — the one from getStepTransaction may expire before the user
    // clicks "Confirm Swap". Other swap modules (stealthex, simpleswap) do the same.
    const rpc = context.platform === "solana" ? context.rpc : undefined
    if (rpc) {
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()
      transaction = setTransactionBlockhash(transaction, latestBlockhash.blockhash)
    }

    return { platform: "solana", transaction }
  }

  // EVM transaction handling
  if (
    txRequest.to === undefined ||
    txRequest.data === undefined ||
    txRequest.chainId === undefined ||
    txRequest.value === undefined ||
    txRequest.from === undefined ||
    txRequest.gasLimit === undefined
  )
    throw new Error("Unknown error, please try again")

  if (txRequest.from.toLowerCase() !== fromAddress.toLowerCase())
    throw new Error("Invalid sender address")

  // the transaction must run on the network holding the token the user is swapping,
  // not on some other network we happen to know about
  if (txRequest.chainId.toString() !== fromAsset.chainId) throw new Error("Unexpected chain")

  // a swap is executed by LI.FI's router — calldata aimed at the token contract itself can
  // only be a transfer or an approval made in the user's name
  if (
    fromAsset.contractAddress &&
    txRequest.to.toLowerCase() === fromAsset.contractAddress.toLowerCase()
  )
    throw new Error("Unexpected transaction target from provider. Please try again.")

  assertNativeValueWithinInput({
    value: BigInt(txRequest.value),
    fromAmount,
    isNativeInput: !fromAsset.contractAddress,
    additionalNativeValue: getAdditionalNativeFeeWei(step, fromAsset, lifiSolanaChainId),
  })

  const knownEvmNetworks = await firstValueFrom(getNetworksMapById$({ platform: "ethereum" }))
  const evmNetwork = knownEvmNetworks[txRequest.chainId.toString()]
  if (!evmNetwork) throw new Error("Unknown chain")

  const publicClient = await findEvmPublicClient(evmNetwork.id)
  if (!publicClient || !evmNetwork.nativeTokenId) throw new Error("Missing public client")

  const transaction = await prepareTransactionRequestWithGasCheck(
    publicClient,
    evmNetwork.nativeTokenId,
    {
      chain: null,
      to: txRequest.to as `0x${string}`,
      value: BigInt(txRequest.value),
      data: txRequest.data as `0x${string}`,
      gasLimit: txRequest.gasLimit,
      account: txRequest.from as `0x${string}`,
    }
  )

  return { platform: "ethereum", transaction }
}

/** the quoted rate scaled to what the leg spends, less the slippage the user accepted */
const planLegFloor = (leg: QuoteLeg, input: bigint, slippage: number) =>
  (leg.outputAmount * input * BigInt(Math.round((1 - slippage) * 10_000))) /
  (leg.inputAmount * 10_000n)

const spenderOf = (route: lifiSdk.Route | undefined) =>
  route?.steps[0]?.estimate.approvalAddress?.toLowerCase()

/**
 * Re-quotes at the user's slippage, which the quote list leaves out so editing it does not reshuffle
 * the quotes. A leg of a plan is re-quoted at what landed, as a single step, and must hold the rate
 * the user accepted: LI.FI cannot re-amount the quoted step. Its token input was approved to the
 * quoted step's spender, so only a fresh route through that spender can use the allowance.
 */
const buildLeg = async ({ leg, input, context, slippage }: BuildLegParams): Promise<BuiltLeg> => {
  try {
    const quotedRoute = leg.data as LifiLegRoute | undefined
    const tool = quotedRoute?.steps[0]?.tool
    if (!quotedRoute || !tool) throw new Error("Please select the quote again")
    if (!leg.signer || !leg.recipient) throw new Error("Missing from address")
    const isPlanLeg = quotedRoute.stepCount > 1

    const freshQuotes =
      (await quoteRoutes(
        {
          fromTokenId: leg.fromTokenId,
          toTokenId: leg.toTokenId,
          fromAmount: input,
          fromAddress: leg.signer,
          toAddress: leg.recipient,
          input: "exact",
        },
        slippage,
        { multiStep: false, chargesTalismanFee: !isPlanLeg || quotedRoute.stepIndex === 0 }
      )) ?? []
    const usableQuotes =
      isPlanLeg && parseTokenId(leg.fromTokenId).type === "evm-erc20"
        ? freshQuotes.filter(
            (quote) => spenderOf(quote.legs[0].data as LifiLegRoute) === spenderOf(quotedRoute)
          )
        : freshQuotes
    const freshLeg = (usableQuotes.find((quote) => quote.subProtocol === tool) ?? usableQuotes[0])
      ?.legs[0]
    const freshRoute = freshLeg?.data as LifiLegRoute | undefined

    let expectedOutput = leg.outputAmount
    if (isPlanLeg) {
      if (!freshRoute) throw new Error("No route for this step right now, please try again later")
      expectedOutput = BigInt(freshRoute.toAmountMin)
      if (expectedOutput < planLegFloor(leg, input, slippage))
        throw new Error("The rate for this step has moved too far, please try again later")
    }

    const step = (freshRoute ?? quotedRoute).steps[0]
    if (!step) throw new Error("No step found in route")

    return {
      transaction: await buildRouteTransaction(step, leg.fromTokenId, leg.signer, input, context),
      fees: freshLeg?.fees ?? leg.fees,
      expectedOutput,
      txInfo: {
        type: "swap-lifi",
        protocolName: tool,
        fromTokenId: leg.fromTokenId,
        toTokenId: leg.toTokenId,
        fromAmount: input.toString(),
        toAmount: expectedOutput.toString(),
        to: leg.recipient,
      },
    }
  } catch (cause) {
    log.error(new Error("Failed to create evm transaction", { cause }))
    throw cause
  }
}

export const lifiSwapModule: SwapModule = {
  protocol: PROTOCOL,
  decentralisationScore: DECENTRALISATION_SCORE,
  supportsSlippageSetting: true,
  getFromAssets: getFromAssets,
  getToAssets: getToAssets,
  getQuote: getQuote,
  buildLeg,
  getApprovalInfo: getApprovalInfo,
}
