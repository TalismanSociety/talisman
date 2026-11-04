import { remoteConfigStore } from "@core/domains/app/store.remoteConfig"
import { getMetadataRpcFromDef } from "@core/domains/metadata/helpers"
import type { WalletTransaction } from "@core/domains/transactions/types"
import type {
  NetworkId,
  NetworkOfPlatform,
  NetworkPlatform,
  TokenId,
  TokenOfPlatform,
} from "@talismn/chaindata-provider"
import { getScaleApi, type ScaleApi } from "@talismn/sapi"
import { api } from "@ui/api"
import { getCanonicalTransaction } from "@ui/domains/Transactions/getCanonicalTransaction"
import { accounts$ } from "@ui/state/accounts"
import {
  getNetworkById$,
  getNetworks$,
  getNetworksMapById$,
  getToken$,
  getTokensMap$,
} from "@ui/state/chaindata"
import { gandalfFetch } from "@ui/util/gandalfFetch"
import { liveQuery } from "dexie"
import { firstValueFrom } from "rxjs"
import type { Hex } from "viem"
import { getSwapSlippageDecimal } from "./hooks/useSwapSlippage"
import type {
  ExchangeParams,
  SettledTransaction,
  SettleLegParams,
  SwapEnv,
  SwapModule,
  SwapModuleDefinition,
} from "./swap-modules/common.swap-module"
import { findEvmPublicClient, getEvmPublicClient } from "./swap-modules/evm-network"
import { memoiseByKey } from "./swap-modules/helpers"
import {
  buildSubstrateDeposit,
  estimateSubstrateDepositFee,
} from "./swap-modules/substrate-deposit"

const createSubstrateApi = async (networkId: NetworkId): Promise<ScaleApi> => {
  const network = await firstValueFrom(getNetworkById$(networkId))
  if (network?.platform !== "polkadot") throw new Error("Unknown substrate network")

  const nativeToken = await firstValueFrom(getToken$(network.nativeTokenId))
  if (!nativeToken) throw new Error("Missing native token")

  const metadataDef = await api.subChainMetadata(network.genesisHash)
  const metadataRpc = getMetadataRpcFromDef(metadataDef)
  if (!metadataRpc) throw new Error("Missing metadata")

  return getScaleApi(
    { chainId: network.id, send: (...args) => api.subSend(network.id, ...args) },
    metadataRpc as `0x${string}`,
    nativeToken,
    network.hasCheckMetadataHash,
    network.signedExtensions,
    network.registryTypes
  )
}

/**
 * A success settles once final. The background marks a Bittensor EVM swap finished when its
 * finality check gave up, so that settles it too instead of waiting forever.
 */
const settledOf = (row: WalletTransaction | null): SettledTransaction | null => {
  if (!row || row.platform === "solana") return null
  const { hash } = row
  switch (row.status) {
    case "pending":
      return null
    case "success":
      return row.confirmed || row.swapStatus === "finished" ? { landed: true, hash } : null
    case "error":
      return { landed: false, hash, stop: "failed" }
    case "replaced":
      return { landed: false, hash, stop: "cancelled" }
    case "unknown":
      return { landed: false, hash, stop: "untracked" }
  }
}

const waitForTransaction = (hash: Hex, signal: AbortSignal) =>
  new Promise<SettledTransaction>((resolve, reject) => {
    signal.throwIfAborted()
    const subscription = liveQuery(() => getCanonicalTransaction(hash)).subscribe({
      next: (row) => {
        const settled = settledOf(row)
        if (!settled) return
        subscription.unsubscribe()
        resolve(settled)
      },
      error: reject,
    })
    signal.addEventListener(
      "abort",
      () => {
        subscription.unsubscribe()
        reject(signal.reason)
      },
      { once: true }
    )
  })

export const uiSwapEnv: SwapEnv = {
  getNetwork: (networkId) => firstValueFrom(getNetworkById$(networkId)),
  getToken: (tokenId) => firstValueFrom(getToken$(tokenId)),
  evmClient: (networkId) => getEvmPublicClient(networkId),
  substrateApi: memoiseByKey(createSubstrateApi),
  proxyFetch: (...args) => gandalfFetch(...args),
  fetch: (...args) => fetch(...args),
  getSwapsConfig: () => remoteConfigStore.get("swaps"),
  getTokensMap: <P extends NetworkPlatform>(platform?: P) =>
    firstValueFrom(getTokensMap$({ platform })) as Promise<Record<TokenId, TokenOfPlatform<P>>>,
  getNetworksMap: <P extends NetworkPlatform>(platform?: P) =>
    firstValueFrom(getNetworksMapById$({ platform })) as Promise<
      Record<NetworkId, NetworkOfPlatform<P>>
    >,
  getNetworks: <P extends NetworkPlatform>(platform?: P) =>
    firstValueFrom(getNetworks$({ platform })) as Promise<NetworkOfPlatform<P>[]>,
  getAccounts: () => firstValueFrom(accounts$),
  getSlippageDecimal: () => getSwapSlippageDecimal(),
  findEvmClient: (networkId) => findEvmPublicClient(networkId),
  estimateSubstrateDepositFee: (fromAsset, fromAddress) =>
    estimateSubstrateDepositFee(fromAsset, fromAddress),
  buildSubstrateDeposit: (params) => buildSubstrateDeposit(params),
  waitForTransaction: (_networkId, hash, signal) => waitForTransaction(hash, signal),
}

export const withSwapEnv = (
  {
    getFromAssets,
    getToAssets,
    getQuote,
    createExchange,
    buildLeg,
    settleLeg,
    ...module
  }: SwapModuleDefinition,
  env: SwapEnv
): SwapModule => ({
  ...module,
  getFromAssets: (signal) => getFromAssets(env, signal),
  getToAssets: (fromTokenId, signal) => getToAssets(fromTokenId, env, signal),
  getQuote: (params, signal) => getQuote(params, env, signal),
  ...(createExchange && {
    createExchange: (params: ExchangeParams) => createExchange(params, env),
  }),
  buildLeg: (params) => buildLeg(params, env),
  ...(settleLeg && {
    settleLeg: (params: SettleLegParams, signal: AbortSignal) => settleLeg(params, env, signal),
  }),
})
