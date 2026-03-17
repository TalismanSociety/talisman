import { remoteConfigStore } from "@core/domains/app/store.remoteConfig"
import * as lifiSdk from "@lifi/sdk"
import { VersionedTransaction } from "@solana/web3.js"
import type { EthNetworkId, SolNetworkId } from "@talismn/chaindata-provider"
import {
  evmErc20TokenId,
  evmNativeTokenId,
  solNativeTokenId,
  solSplTokenId,
} from "@talismn/chaindata-provider"
import { getExtensionPublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { getNetworkById$, getNetworksMapById$, getToken$, getTokensMap$ } from "@ui/state/chaindata"
import BigNumber from "bignumber.js"
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
import { zeroAddress } from "viem"
import { getSwapLifiSlippageDecimal } from "../hooks/useSwapLifiSlippage"
import {
  type ApprovalInfo,
  type BaseQuote,
  type GetTransactionParams,
  getTokenIdForSwappableAsset,
  type QuoteParams,
  type SupportedSwapProtocol,
  type SwapModule,
  type SwapModuleTransaction,
} from "./common.swap-module"
import { getLifiTalismanFee as getTalismanFee, LIFI_PROTOCOL_FEE as LIFI_FEE } from "./fee-utils"

const apiUrl = "https://lifi.talisman.xyz/v1"
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

const getLifiSolanaChainId = async () => {
  const { lifi } = await remoteConfigStore.get("swaps")
  return lifi.solanaChainId
}

/** Convert a Talisman chain ID to a LI.FI numeric chain ID. */
const toLifiChainId = async (chainId: string | number): Promise<number> => {
  if (chainId === SOLANA_NETWORK_ID) return getLifiSolanaChainId()
  return +chainId
}

/** Resolve a LI.FI fee/gas token to a Talisman token ID, handling both EVM and Solana chains. */
const feeTokenId = async (token: { address: string; chainId: number }): Promise<string> => {
  const solanaChainId = await getLifiSolanaChainId()
  if (token.chainId === solanaChainId) {
    return SOLANA_NATIVE_ADDRESSES.has(token.address)
      ? solNativeTokenId(SOLANA_NETWORK_ID)
      : solSplTokenId(SOLANA_NETWORK_ID, token.address)
  }
  return token.address === zeroAddress
    ? evmNativeTokenId(token.chainId.toString())
    : evmErc20TokenId(token.chainId.toString(), token.address as `0x${string}`)
}

lifiSdk.createConfig({ integrator: "talisman", apiUrl })

const isAbortError = (cause: unknown): boolean =>
  cause instanceof Error && cause.name === "AbortError"

// --- Helper to get a viem PublicClient for an EVM network ---
const getPublicClient = async (evmNetworkId: EthNetworkId | string | undefined) => {
  if (!evmNetworkId) return undefined
  const evmNetwork = await firstValueFrom(getNetworkById$(evmNetworkId))
  const nativeToken = await firstValueFrom(getToken$(evmNetwork?.nativeTokenId))
  if (!evmNetwork || nativeToken?.type !== "evm-native" || evmNetwork.platform !== "ethereum")
    return undefined
  return getExtensionPublicClient(evmNetwork)
}

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
  const [allSdkTokens, solanaChainId] = await Promise.all([
    lifiSdk
      .getTokens({ chainTypes: [lifiSdk.ChainType.EVM, lifiSdk.ChainType.SVM] })
      .then((r) => r?.tokens),
    getLifiSolanaChainId(),
  ])

  for (const talismanTokenId of (await remoteConfigStore.get("swaps"))?.lifiTalismanTokens ?? []) {
    const [chainId, type, contractAddress] = talismanTokenId.split(":")
    if (type !== "evm-erc20" && type !== "sol-spl") continue

    try {
      const lifiChainId = type === "sol-spl" ? solanaChainId : parseInt(chainId, 10)
      const token = await lifiSdk.getToken(lifiChainId, contractAddress)
      allSdkTokens[token?.chainId]?.push?.(token)
    } catch (cause) {
      // biome-ignore lint/suspicious/noConsole: legacy
      console.warn(`Failed to add lifi token ${talismanTokenId}`, cause)
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
          const isNative = SOLANA_NATIVE_ADDRESSES.has(sdkToken.address)
          id = isNative
            ? solNativeTokenId(SOLANA_NETWORK_ID)
            : solSplTokenId(SOLANA_NETWORK_ID, sdkToken.address)
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

  // Populate the lookup cache
  assetsByTokenId.clear()
  for (const asset of result) assetsByTokenId.set(asset.tokenId, asset)

  return result
}

const getFromAssets = async (signal: AbortSignal): Promise<string[]> => {
  const assets = await getLifiAssets(signal)
  return [...new Set(assets.map((a) => a.tokenId))]
}

const getToAssets = async (_fromTokenId: string | null, signal: AbortSignal): Promise<string[]> => {
  const assets = await getLifiAssets(signal)
  return [...new Set(assets.map((a) => a.tokenId))]
}

const getRoutes = async (
  params: QuoteParams,
  signal: AbortSignal
): Promise<lifiSdk.RoutesResponse | null> => {
  try {
    const { fromTokenId, toTokenId, fromAmount, fromAddress, toAddress } = params
    if (!fromTokenId || !toTokenId || !fromAmount) return null
    if (signal.aborted) return null

    const fromAsset = resolveAsset(fromTokenId)
    const toAsset = resolveAsset(toTokenId)
    if (!fromAsset || !toAsset) return null

    const SWAP_PLACEHOLDER_ADDRESS = "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a"
    const SOLANA_PLACEHOLDER_ADDRESS = "11111111111111111111111111111111"

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

    // TODO: Re-enable fees for Solana routes once the "talisman" integrator has a
    // Solana fee wallet configured on the LI.FI portal (https://portal.li.fi/).
    // Without it the API returns HTTP 400 (code 1011) and no routes are found.
    const isSolanaRoute = isSolanaFrom || isSolanaTo
    const fee = isSolanaRoute
      ? 0
      : await getTalismanFee({ fromAssetId: fromTokenId, toAssetId: toTokenId })
    const slippage = await getSwapLifiSlippageDecimal()
    if (signal.aborted) return null
    return await lifiSdk.getRoutes(
      {
        fromAddress: effectiveFromAddress,
        toAddress: effectiveToAddress,
        fromChainId: await toLifiChainId(fromAsset.chainId),
        toChainId: await toLifiChainId(toAsset.chainId),
        fromAmount: fromAmount.toString(),
        fromTokenAddress,
        toTokenAddress,
        options: { integrator: "talisman", fee, slippage },
      },
      { signal }
    )
  } catch (cause) {
    if (signal.aborted || isAbortError(cause)) return null

    // biome-ignore lint/suspicious/noConsole: legacy
    console.warn("Failed to fetch lifi routes", cause)
    return {
      routes: [],
      unavailableRoutes: { failed: [], filteredOut: [] },
    } as lifiSdk.RoutesResponse
  }
}

type LifiRouteQuote = BaseQuote<lifiSdk.Route>

const getRouteQuote = async (
  route: lifiSdk.Route,
  fromTokenId: string,
  toTokenId: string | null
): Promise<LifiRouteQuote | null> => {
  const step = route.steps[0]
  if (!step) return null

  const fromAsset = resolveAsset(fromTokenId)
  if (!fromAsset) return null

  const fees = await Promise.all(
    step.estimate.feeCosts?.map(async (fee) => ({
      amount: BigNumber(fee.amount).times(10 ** -fee.token.decimals),
      name: fee.name,
      tokenId: await feeTokenId(fee.token),
    })) ?? []
  )

  if (step.estimate.gasCosts) {
    for (const c of step.estimate.gasCosts) {
      fees.push({
        amount: BigNumber(c.amount).times(10 ** -c.token.decimals),
        name: "Gas",
        tokenId: await feeTokenId(c.token),
      })
    }
  }

  const talismanFee = await getTalismanFee({
    fromAssetId: fromTokenId,
    toAssetId: toTokenId ?? undefined,
  })
  fees.push({
    amount: BigNumber(step.estimate.fromAmount.toString())
      .times(10 ** -fromAsset.decimals)
      .times(Math.round((LIFI_FEE + talismanFee) * 10_000) / 10_000),
    name: "Talisman Fee",
    tokenId: fromTokenId,
  })

  const totalGasLimit =
    fromAsset.contractAddress === undefined
      ? route.steps
          .flatMap((step) =>
            (step.estimate.gasCosts ?? []).flatMap((gas) =>
              String(gas.token.chainId) === String(fromAsset.chainId) &&
              gas.token.address === zeroAddress
                ? gas.limit
                : "0"
            )
          )
          .reduce((a, c) => a.plus(c), BigNumber(0))
          .toString()
      : undefined

  return {
    decentralisationScore: DECENTRALISATION_SCORE,
    protocol: PROTOCOL,
    subProtocol: step.tool,
    inputAmountBN: BigInt(step.estimate.fromAmount),
    outputAmountBN: BigInt(route.toAmountMin),
    timeInSec: step.estimate.executionDuration,
    fees,
    providerLogo: step.toolDetails.logoURI,
    providerName: step.toolDetails.name,
    talismanFee: Math.round((LIFI_FEE + talismanFee) * 10_000) / 10_000,
    data: route,
    maxNativeTokenGasBuffer: totalGasLimit,
  }
}

const getQuote = async (params: QuoteParams, signal: AbortSignal): Promise<BaseQuote[] | null> => {
  const { fromTokenId, toTokenId } = params
  if (!fromTokenId || signal.aborted) return null

  const routes = await getRoutes(params, signal)
  if (!routes || signal.aborted) return null

  const quotes = await Promise.allSettled(
    routes.routes.map((route) => getRouteQuote(route, fromTokenId, toTokenId))
  )
  if (signal.aborted) return null

  // Filter out nulls and failed promises
  const validQuotes = quotes
    .filter((r): r is PromiseFulfilledResult<LifiRouteQuote | null> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((q): q is LifiRouteQuote => q !== null)
  return validQuotes.length > 0 ? validQuotes : null
}

// if approval is required, returns the contract to approve for, the amount, and token contract
const getApprovalInfo = (
  params: QuoteParams & { quoteData: BaseQuote | BaseQuote[] | null }
): ApprovalInfo => {
  const { fromTokenId, fromAddress, selectedSubProtocol, quoteData } = params
  if (!fromTokenId || !fromAddress) return null
  const fromAsset = resolveAsset(fromTokenId)
  if (!quoteData || !fromAsset || !fromAsset.contractAddress) return null

  const quoteItem = Array.isArray(quoteData)
    ? quoteData.find((d) => d?.subProtocol === selectedSubProtocol)
    : quoteData

  const lifiData = quoteItem?.data as lifiSdk.Route | undefined
  if (!lifiData) return null

  const step = lifiData.steps[0]
  if (!step?.estimate.approvalAddress) return null

  return {
    contractAddress: step.estimate.approvalAddress,
    amount: BigInt(lifiData.fromAmount),
    tokenAddress: fromAsset.contractAddress,
    chainId: step.action.fromChainId,
    fromAddress,
    protocolName: PROTOCOL_NAME,
  }
}

const getTransaction = async (
  params: GetTransactionParams
): Promise<SwapModuleTransaction | null> => {
  try {
    const { fromTokenId, fromAddress, exchange: quoteData, context } = params
    const selectedQuote = quoteData as BaseQuote<lifiSdk.Route> | undefined
    if (!selectedQuote?.data) {
      throw new Error("Please select the quote again")
    }

    if (!fromAddress) throw new Error("Missing from address")
    const fromAsset = resolveAsset(fromTokenId)
    if (!fromAsset) throw new Error("Not supported on Lifi")

    const step = selectedQuote.data.steps[0]
    if (!step) throw new Error("No step found in route")

    // Fetch fresh transaction calldata from LiFi at confirmation time
    const stepTransaction = await lifiSdk.getStepTransaction(step)
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

      const transaction = VersionedTransaction.deserialize(txBytes)

      // Refresh the blockhash — the one from getStepTransaction may expire before the user
      // clicks "Confirm Swap". Other swap modules (stealthex, simpleswap) do the same.
      const connection = context.platform === "solana" ? context.connection : undefined
      if (connection) {
        const { blockhash } = await connection.getLatestBlockhash()
        transaction.message.recentBlockhash = blockhash
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

    const knownEvmNetworks = await firstValueFrom(getNetworksMapById$({ platform: "ethereum" }))
    const evmNetwork = knownEvmNetworks[txRequest.chainId.toString()]
    if (!evmNetwork) throw new Error("Unknown chain")

    const publicClient = await getPublicClient(evmNetwork.id)
    if (!publicClient) throw new Error("Missing public client")

    const transaction = await publicClient.prepareTransactionRequest({
      chain: null,
      to: txRequest.to as `0x${string}`,
      value: BigInt(txRequest.value),
      data: txRequest.data as `0x${string}`,
      gasLimit: txRequest.gasLimit,
      account: txRequest.from as `0x${string}`,
    })

    return { platform: "ethereum", transaction }
  } catch (cause) {
    // biome-ignore lint/suspicious/noConsole: legacy
    console.error(new Error("Failed to create evm transaction", { cause }))
    throw cause
  }
}

export const lifiSwapModule: SwapModule = {
  protocol: PROTOCOL,
  decentralisationScore: DECENTRALISATION_SCORE,
  getFromAssets: getFromAssets,
  getToAssets: getToAssets,
  getQuote: getQuote,
  createExchange: async () => null,
  getTransaction: getTransaction,
  getApprovalInfo: getApprovalInfo,
}

export type LifiStatus = "unknown" | "not_found" | "exchanging" | "finished" | "failed" | "invalid"
const statusMap: Record<lifiSdk.StatusResponse["status"], LifiStatus> = {
  NOT_FOUND: "not_found",
  INVALID: "invalid",
  PENDING: "exchanging",
  DONE: "finished",
  FAILED: "failed",
}
export const swapStatus$ = (id: string): Observable<LifiStatus | undefined> =>
  retryStatus$(id).pipe(
    switchMap((status) => {
      if (status === undefined) return of(undefined)

      const shouldRefresh = (status: LifiStatus | undefined) =>
        !(status && ["invalid", "finished", "failed"].includes(status))

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

const retryStatus$ = (id: string): Observable<LifiStatus | undefined> =>
  defer(async () => {
    // id may be "txHash::fromChainId::toChainId" (new) or just "txHash" (legacy)
    const [txHash, fromChain, toChain] = id.split("::")
    const status = (
      await lifiSdk.getStatus({
        txHash,
        ...(fromChain ? { fromChain: Number(fromChain) } : {}),
        ...(toChain ? { toChain: Number(toChain) } : {}),
      })
    ).status
    return statusMap[status] ?? "unknown"
  }).pipe(
    // retry up to 10 times, wait 5s between each retry
    retry({ count: 10, delay: 5_000 }),

    // log when all retries failed, and return undefined
    catchError((error) => {
      // biome-ignore lint/suspicious/noConsole: legacy
      console.error(`Failed to fetch exchange status for '${id}'`, error)
      return of(undefined)
    })
  )
