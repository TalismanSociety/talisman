import type { Chain as ViemChain } from "viem/chains"
import * as lifiSdk from "@lifi/sdk"
import { chainConnectorsAtom } from "@talismn/balances-react"
import { evmErc20TokenId, evmNativeTokenId } from "@talismn/chaindata-provider"
import BigNumber from "bignumber.js"
import { remoteConfigStore } from "extension-core"
import { atom } from "jotai"
import { atomFamily, atomWithObservable, loadable } from "jotai/utils"
import {
  catchError,
  defer,
  interval,
  Observable,
  of,
  retry,
  startWith,
  switchMap,
  takeWhile,
} from "rxjs"
import { publicActions, TransactionRequest, zeroAddress } from "viem"
import * as allEvmChains from "viem/chains"

import { getNetworksMapById$, getTokensMap$ } from "@ui/state"

import {
  fromAddressAtom,
  fromAmountAtom,
  fromAssetAtom,
  getTokenIdForSwappableAsset,
  QuoteFunction,
  selectedSubProtocolAtom,
  SupportedSwapProtocol,
  SwapModule,
  SwappableAssetBaseType,
  swapQuoteRefresherAtom,
  toAddressAtom,
  toAssetAtom,
} from "./common.swap-module"

const apiUrl = "https://lifi.talisman.xyz/v1"
const PROTOCOL: SupportedSwapProtocol = "lifi" as const
const PROTOCOL_NAME = "LI.FI"
const DECENTRALISATION_SCORE = 2
const TALISMAN_FEE = 0.002 // We take a fee of 0.2%
const LIFI_FEE = 0.0025 // lifi takes a fee of 0.25%

lifiSdk.createConfig({ integrator: "talisman", apiUrl })

type RouteProps = {
  fromAssetId?: string
  toAssetId?: string
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

const assetsSelector = atom(async (get): Promise<SwappableAssetBaseType[]> => {
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
      // eslint-disable-next-line no-console
      console.warn(`Failed to add lifi token ${talismanTokenId}`, cause)
    }
  }

  const knownEvmNetworks = await get(
    atomWithObservable(() => getNetworksMapById$({ platform: "ethereum" })),
  )
  const knownTokens = await get(atomWithObservable(() => getTokensMap$({ platform: "ethereum" })))

  return Object.entries(allSdkTokens)
    .filter(([chainId]) => knownEvmNetworks[chainId])
    .map(([chainId, tokens]): SwappableAssetBaseType[] =>
      tokens.map((token) => {
        const contractAddress = token.address === zeroAddress ? undefined : token.address
        const id = getTokenIdForSwappableAsset("evm", chainId, contractAddress)
        const symbol = knownTokens[id]?.symbol ?? token.symbol
        const decimals = knownTokens[id]?.decimals ?? token.decimals
        const image = knownTokens[id]?.logo ?? token.logoURI

        return {
          id,
          name: token.name,
          symbol,
          decimals,
          chainId,
          contractAddress,
          image,
          networkType: "evm",
          context: { lifi: token },
        }
      }),
    )
    .flat()
})

export const fromAssetsSelector = atom(async (get) => await get(assetsSelector))
export const toAssetsSelector = atom(async (get) => await get(assetsSelector))

const routesAtom = atom(async (get) => {
  try {
    const SWAP_PLACEHOLDER_ADDRESS = "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a"
    const fromAddress = get(fromAddressAtom) ?? SWAP_PLACEHOLDER_ADDRESS
    const toAddress = get(toAddressAtom) ?? SWAP_PLACEHOLDER_ADDRESS
    const fromAsset = get(fromAssetAtom)
    const toAsset = get(toAssetAtom)
    const fromAmount = get(fromAmountAtom)
    const knownEvmNetworks = await get(
      atomWithObservable(() => getNetworksMapById$({ platform: "ethereum" })),
    )

    if (fromAmount.planck === 0n) return null
    // assets not supported
    if (fromAsset?.networkType !== "evm" || toAsset?.networkType !== "evm") return null
    const evmNetwork = knownEvmNetworks[fromAsset.chainId.toString()]
    // network not supported
    if (!evmNetwork) return null

    get(swapQuoteRefresherAtom)

    const fee = await getTalismanFee({ fromAssetId: fromAsset?.id, toAssetId: toAsset?.id })
    return await lifiSdk.getRoutes({
      fromAddress,
      toAddress,
      fromChainId: +fromAsset.chainId,
      toChainId: +toAsset.chainId,
      fromAmount: fromAmount.planck.toString(),
      fromTokenAddress: fromAsset.contractAddress ?? zeroAddress,
      toTokenAddress: toAsset.contractAddress ?? zeroAddress,
      options: { integrator: "talisman", fee },
    })
  } catch (cause) {
    // eslint-disable-next-line no-console
    console.warn("Failed to fetch lifi routes", cause)
    return {
      routes: [],
      unavailableRoutes: { failed: [], filteredOut: [] },
    } as lifiSdk.RoutesResponse
  }
})

const quoteAtom: QuoteFunction<lifiSdk.Route & { transactionRequest: lifiSdk.TransactionRequest }> =
  loadable(
    atom(async (get) => {
      const routes = await get(routesAtom)
      if (!routes) return null

      return routes.routes.map((route) => get(routeQuoteAtom(route.id)))
    }),
  )

const routeQuoteAtom = atomFamily((id: string) =>
  loadable(
    atom(async (get) => {
      const routes = await get(routesAtom)
      if (!routes) return null

      const route = routes.routes.find((r) => r.id === id)
      const step = route?.steps[0]
      if (!step) return null

      const transaction = await lifiSdk.getStepTransaction(step)
      if (!transaction?.transactionRequest) return null

      const fromAsset = get(fromAssetAtom)
      const toAsset = get(toAssetAtom)
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
        fromAssetId: fromAsset?.id,
        toAssetId: toAsset?.id,
      })
      fees.push({
        amount: BigNumber(step.estimate.fromAmount.toString())
          .times(10 ** -fromAsset.decimals)
          .times(Math.round((LIFI_FEE + talismanFee) * 10_000) / 10_000),
        name: "Talisman Fee",
        tokenId: fromAsset.id,
      })

      const totalGasLimit =
        fromAsset?.networkType === "evm" && fromAsset?.contractAddress === undefined
          ? route.steps
              .flatMap((step) =>
                (step.estimate.gasCosts ?? []).flatMap((gas) =>
                  String(gas.token.chainId) === String(fromAsset?.chainId) &&
                  gas.token.address === zeroAddress
                    ? gas.limit
                    : "0",
                ),
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
    }),
  ),
)

// if approval is required, returns the contract to approve for, the amount, and token contract
const approvalAtom = atom((get) => {
  const quote = get(quoteAtom)
  const fromAsset = get(fromAssetAtom)
  if (quote.state !== "hasData" || !quote.data || !fromAsset || !fromAsset.contractAddress)
    return null

  const selectedSubProtocol = get(selectedSubProtocolAtom)
  const quoteData = Array.isArray(quote.data)
    ? quote.data
        .map((d) => (d.state === "hasData" ? d.data : null))
        .find((d) => d?.subProtocol === selectedSubProtocol)
    : quote.data
  const lifiData = quoteData?.data
  if (!lifiData?.transactionRequest) return null

  const contractAddress = lifiData.transactionRequest.to
  const chainId = lifiData.transactionRequest.chainId
  const fromAddress = lifiData.transactionRequest.from
  if (!contractAddress || chainId === undefined || !fromAddress) return null

  const amount = BigInt(lifiData.fromAmount)

  return {
    contractAddress,
    amount,
    tokenAddress: fromAsset.contractAddress,
    chainId,
    fromAddress,
    protocolName: PROTOCOL_NAME,
  }
})

const evmTransactionAtom = atom(async (get): Promise<TransactionRequest | undefined> => {
  try {
    const evmChainConnector = get(chainConnectorsAtom).evm
    if (!evmChainConnector) throw new Error("Missing evm chain connector")

    const quote = get(quoteAtom)
    const selectedSubProtocol = get(selectedSubProtocolAtom)
    if (quote.state !== "hasData" || !quote.data) throw new Error("Swap not ready yet")

    const fromAddress = get(fromAddressAtom)
    if (!fromAddress) throw new Error("Missing from address")

    const fromAsset = get(fromAssetAtom)
    if (fromAsset?.networkType !== "evm") throw new Error("Not supported on Lifi")

    const walletClient = (
      await evmChainConnector.getWalletClientForEvmNetwork(fromAsset.chainId.toString())
    )?.extend(publicActions)
    if (!walletClient) throw new Error("Missing evm client")

    const quoteData = Array.isArray(quote.data)
      ? quote.data
          .map((d) => (d.state === "hasData" ? d.data : null))
          .find((d) => d?.subProtocol === selectedSubProtocol)
      : quote.data
    const lifiData = quoteData?.data
    if (!lifiData?.transactionRequest) throw new Error("Please select the quote again")

    const txRequest = lifiData.transactionRequest
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

    const chain: ViemChain | undefined = Object.values(allEvmChains).find(
      (c) => c?.id === txRequest.chainId,
    )
    if (!chain) throw new Error("Unknown chain")

    return walletClient.prepareTransactionRequest({
      chain,
      to: txRequest.to as `0x${string}`,
      value: BigInt(txRequest.value),
      data: txRequest.data as `0x${string}`,
      gasLimit: txRequest.gasLimit,
      account: txRequest.from as `0x${string}`,
    })
  } catch (cause) {
    // eslint-disable-next-line no-console
    console.error(new Error("Failed to create evm transaction", { cause }))
    throw cause
  }
})

export const lifiSwapModule: SwapModule = {
  protocol: PROTOCOL,
  fromAssetsSelector,
  toAssetsSelector,
  quote: quoteAtom,
  exchangeAtom: atom(async () => undefined),
  evmTransactionAtom,
  substratePayloadAtom: () => atom(async () => null),
  decentralisationScore: DECENTRALISATION_SCORE,
  approvalAtom,
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
          takeWhile((status) => shouldRefresh(status), true),
        )
      }
      return of(status)
    }),
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
      // eslint-disable-next-line no-console
      console.error(`Failed to fetch exchange status for '${id}'`, error)
      return of(undefined)
    }),
  )
