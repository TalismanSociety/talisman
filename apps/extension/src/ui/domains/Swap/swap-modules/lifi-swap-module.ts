import { remoteConfigStore } from "@core/domains/app/store.remoteConfig"
import * as lifiSdk from "@lifi/sdk"
import type { EthNetworkId, TokenId } from "@talismn/chaindata-provider"
import { evmErc20TokenId, evmNativeTokenId } from "@talismn/chaindata-provider"
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
import { type TransactionRequest, zeroAddress } from "viem"
import {
  type ApprovalInfo,
  type BaseQuote,
  type EvmTxParams,
  getTokenIdForSwappableAsset,
  type QuoteParams,
  type SupportedSwapProtocol,
  type SwapModule,
} from "./common.swap-module"

const apiUrl = "https://lifi.talisman.xyz/v1"
const PROTOCOL: SupportedSwapProtocol = "lifi" as const
const PROTOCOL_NAME = "LI.FI"
const DECENTRALISATION_SCORE = 2
const TALISMAN_FEE = 0.002 // We take a fee of 0.2%
const LIFI_FEE = 0.0025 // lifi takes a fee of 0.25%

lifiSdk.createConfig({ integrator: "talisman", apiUrl })

type RouteProps = {
  fromAssetId?: TokenId
  toAssetId?: TokenId
}
const customFeeForRoute = async ({
  fromAssetId,
  toAssetId,
}: RouteProps): Promise<number | undefined> => {
  const lifiCustomFeeTokens = (await remoteConfigStore.get("swaps"))?.lifiCustomFeeTokens ?? {}

  // prefer toAsset fee
  const toFee = toAssetId && lifiCustomFeeTokens[toAssetId]
  if (typeof toFee === "number") return toFee

  // fall back to fromAsset fee
  const fromFee = fromAssetId && lifiCustomFeeTokens[fromAssetId]
  if (typeof fromFee === "number") return fromFee

  // use default fee
  return undefined
}
const getTalismanFee = async (route: RouteProps) => {
  const customFee = await customFeeForRoute(route)
  if (customFee !== undefined) return customFee
  return TALISMAN_FEE
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
  const allSdkTokens = (
    await lifiSdk.getTokens({ chainTypes: [lifiSdk.ChainType.EVM, lifiSdk.ChainType.SVM] })
  )?.tokens

  for (const talismanTokenId of (await remoteConfigStore.get("swaps"))?.lifiTalismanTokens ?? []) {
    const [chainId, type, contractAddress] = talismanTokenId.split(":")
    if (type !== "evm-erc20") continue

    try {
      const token = await lifiSdk.getToken(parseInt(chainId, 10), contractAddress)
      allSdkTokens[token?.chainId]?.push?.(token)
    } catch (cause) {
      // biome-ignore lint/suspicious/noConsole: legacy
      console.warn(`Failed to add lifi token ${talismanTokenId}`, cause)
    }
  }

  const knownEvmNetworks = await firstValueFrom(getNetworksMapById$({ platform: "ethereum" }))
  const knownTokens = await firstValueFrom(getTokensMap$({ platform: "ethereum" }))

  const result = Object.entries(allSdkTokens)
    .filter(([chainId]) => knownEvmNetworks[chainId])
    .flatMap(([chainId, tokens]): LifiInternalAsset[] =>
      tokens.flatMap((sdkToken) => {
        const contractAddress = sdkToken.address === zeroAddress ? undefined : sdkToken.address
        const id = getTokenIdForSwappableAsset("evm", chainId, contractAddress)

        const token = knownTokens[id]
        if (!token) return []

        return {
          tokenId: id,
          chainId,
          contractAddress,
          decimals: token.decimals,
          symbol: token.symbol,
          lifiToken: sdkToken,
        }
      })
    )

  // Populate the lookup cache
  assetsByTokenId.clear()
  for (const asset of result) assetsByTokenId.set(asset.tokenId, asset)

  return result
}

const getFromAssets = async (signal: AbortSignal): Promise<string[]> => {
  const assets = await getLifiAssets(signal)
  return assets.map((a) => a.tokenId)
}

const getToAssets = async (_fromTokenId: string | null, signal: AbortSignal): Promise<string[]> => {
  const assets = await getLifiAssets(signal)
  return assets.map((a) => a.tokenId)
}

const getRoutes = async (params: QuoteParams): Promise<lifiSdk.RoutesResponse | null> => {
  try {
    const { fromTokenId, toTokenId, fromAmount, fromAddress, toAddress } = params
    if (!fromTokenId || !toTokenId || !fromAmount) return null

    const fromAsset = resolveAsset(fromTokenId)
    const toAsset = resolveAsset(toTokenId)
    if (!fromAsset || !toAsset) return null

    const SWAP_PLACEHOLDER_ADDRESS = "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a"
    const effectiveFromAddress = fromAddress ?? SWAP_PLACEHOLDER_ADDRESS
    const effectiveToAddress = toAddress ?? SWAP_PLACEHOLDER_ADDRESS
    const knownEvmNetworks = await firstValueFrom(getNetworksMapById$({ platform: "ethereum" }))

    if (fromAmount === 0n) return null
    const evmNetwork = knownEvmNetworks[fromAsset.chainId.toString()]
    // network not supported
    if (!evmNetwork) return null

    const fee = await getTalismanFee({ fromAssetId: fromTokenId, toAssetId: toTokenId })
    return await lifiSdk.getRoutes({
      fromAddress: effectiveFromAddress,
      toAddress: effectiveToAddress,
      fromChainId: +fromAsset.chainId,
      toChainId: +toAsset.chainId,
      fromAmount: fromAmount.toString(),
      fromTokenAddress: fromAsset.contractAddress ?? zeroAddress,
      toTokenAddress: toAsset.contractAddress ?? zeroAddress,
      options: { integrator: "talisman", fee },
    })
  } catch (cause) {
    // biome-ignore lint/suspicious/noConsole: legacy
    console.warn("Failed to fetch lifi routes", cause)
    return {
      routes: [],
      unavailableRoutes: { failed: [], filteredOut: [] },
    } as lifiSdk.RoutesResponse
  }
}

type LifiRouteQuote = BaseQuote<lifiSdk.Route & { transactionRequest: lifiSdk.TransactionRequest }>

const getRouteQuote = async (
  route: lifiSdk.Route,
  fromTokenId: string,
  toTokenId: string | null
): Promise<LifiRouteQuote | null> => {
  const step = route.steps[0]
  if (!step) return null

  const transaction = await lifiSdk.getStepTransaction(step)
  if (!transaction?.transactionRequest) return null

  const fromAsset = resolveAsset(fromTokenId)
  if (!fromAsset) return null

  const fees =
    step.estimate.feeCosts?.map((fee) => ({
      amount: BigNumber(fee.amount).times(10 ** -fee.token.decimals),
      name: fee.name,
      tokenId:
        fee.token.address === zeroAddress
          ? evmNativeTokenId(fee.token.chainId.toString())
          : evmErc20TokenId(fee.token.chainId.toString(), fee.token.address as `0x${string}`),
    })) ?? []

  if (step.estimate.gasCosts) {
    step.estimate.gasCosts.forEach((c) => {
      fees.push({
        amount: BigNumber(c.amount).times(10 ** -c.token.decimals),
        name: "Gas",
        tokenId:
          c.token.address === zeroAddress
            ? evmNativeTokenId(c.token.chainId.toString())
            : evmErc20TokenId(c.token.chainId.toString(), c.token.address as `0x${string}`),
      })
    })
  }

  // add talisman fee
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
    data: { ...route, transactionRequest: transaction.transactionRequest },
    maxNativeTokenGasBuffer: totalGasLimit,
  }
}

const getQuote = async (params: QuoteParams, _signal: AbortSignal): Promise<BaseQuote[] | null> => {
  const { fromTokenId, toTokenId } = params
  if (!fromTokenId) return null

  const routes = await getRoutes(params)
  if (!routes) return null

  const quotes = await Promise.allSettled(
    routes.routes.map((route) => getRouteQuote(route, fromTokenId, toTokenId))
  )

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
  const { fromTokenId, selectedSubProtocol, quoteData } = params
  if (!fromTokenId) return null
  const fromAsset = resolveAsset(fromTokenId)
  if (!quoteData || !fromAsset || !fromAsset.contractAddress) return null

  const quoteItem = Array.isArray(quoteData)
    ? quoteData.find((d) => d?.subProtocol === selectedSubProtocol)
    : quoteData

  const lifiData = quoteItem?.data as
    | (lifiSdk.Route & { transactionRequest: lifiSdk.TransactionRequest })
    | undefined
  if (!lifiData?.transactionRequest) return null

  const contractAddress = lifiData.transactionRequest.to
  const chainId = lifiData.transactionRequest.chainId
  const txFromAddress = lifiData.transactionRequest.from
  if (!contractAddress || chainId === undefined || !txFromAddress) return null

  const amount = BigInt(lifiData.fromAmount)

  return {
    contractAddress,
    amount,
    tokenAddress: fromAsset.contractAddress,
    chainId,
    fromAddress: txFromAddress,
    protocolName: PROTOCOL_NAME,
  }
}

const getEvmTransaction = async (params: EvmTxParams): Promise<TransactionRequest | undefined> => {
  try {
    const { fromTokenId, fromAddress, exchange: quoteData } = params
    type LifiQuoteData = BaseQuote<
      lifiSdk.Route & { transactionRequest: lifiSdk.TransactionRequest }
    >
    const selectedQuote = quoteData as LifiQuoteData | undefined
    if (!selectedQuote?.data?.transactionRequest) {
      throw new Error("Please select the quote again")
    }

    if (!fromAddress) throw new Error("Missing from address")
    const fromAsset = resolveAsset(fromTokenId)
    if (!fromAsset) throw new Error("Not supported on Lifi")

    const txRequest = selectedQuote.data.transactionRequest
    if (
      !txRequest ||
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

    return publicClient.prepareTransactionRequest({
      chain: null,
      to: txRequest.to as `0x${string}`,
      value: BigInt(txRequest.value),
      data: txRequest.data as `0x${string}`,
      gasLimit: txRequest.gasLimit,
      account: txRequest.from as `0x${string}`,
    })
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
  createExchange: async () => undefined,
  getEvmTransaction: getEvmTransaction,
  getSubstratePayload: async () => null,
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
    const status = (await lifiSdk.getStatus({ txHash: id })).status
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
