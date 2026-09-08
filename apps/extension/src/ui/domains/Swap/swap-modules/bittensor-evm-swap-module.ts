import { log } from "@common/log"
import {
  BITTENSOR_BALANCE_TRANSFER_PRECOMPILE,
  BITTENSOR_EVM_PAIRS,
  BITTENSOR_EXISTENTIAL_DEPOSIT_RAO,
  BITTENSOR_SS58_PREFIX,
  BITTENSOR_WEI_PER_RAO,
  type BittensorEvmPair,
} from "@core/domains/bittensor/constants"
import { getMetadataRpcFromDef } from "@core/domains/metadata/helpers"
import { abiBittensorBalanceTransfer } from "@core/util/abi"
import { MultiAddress } from "@polkadot-api/descriptors"
import { evmNativeTokenId, subNativeTokenId, type TokenId } from "@talismn/chaindata-provider"
import {
  frontierH160ToSs58Mirror,
  frontierSs58ToPublicKeyHex,
  isAddressEqual,
  isEthereumAddress,
} from "@talismn/crypto"
import { getScaleApi, type ScaleApi } from "@talismn/sapi"
import { planckToTokens } from "@talismn/util"
import { api } from "@ui/api"
import { getExtensionPublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { getNetworkById$, getToken$ } from "@ui/state/chaindata"
import BigNumber from "bignumber.js"
import { firstValueFrom } from "rxjs"
import { encodeFunctionData, zeroHash } from "viem"
import bittensorLogo from "./bittensor-logo.svg?url"
import type {
  BaseQuote,
  GetTransactionParams,
  QuoteFee,
  QuoteParams,
  SupportedSwapProtocol,
  SwapModule,
  SwapModuleTransaction,
} from "./common.swap-module"
import { prepareTransactionRequestWithGasCheck } from "./evm-gas-check"
import { assertNativeValueWithinInput } from "./provider-transaction-guards"

const PROTOCOL: SupportedSwapProtocol = "bittensor-evm"
const PROTOCOL_NAME = "Bittensor EVM"
const DECENTRALISATION_SCORE = 3
const ESTIMATED_DURATION_SEC = 12
const TAO_DECIMALS = 9
const EVM_TAO_DECIMALS = 18

type Direction = "sub-to-evm" | "evm-to-sub"

type Route = {
  direction: Direction
  pair: BittensorEvmPair
  fromTokenId: TokenId
  toTokenId: TokenId
}

const ROUTES: Route[] = BITTENSOR_EVM_PAIRS.flatMap((pair) => [
  {
    direction: "sub-to-evm" as const,
    pair,
    fromTokenId: subNativeTokenId(pair.substrateNetworkId),
    toTokenId: evmNativeTokenId(pair.evmNetworkId),
  },
  {
    direction: "evm-to-sub" as const,
    pair,
    fromTokenId: evmNativeTokenId(pair.evmNetworkId),
    toTokenId: subNativeTokenId(pair.substrateNetworkId),
  },
])

const findRoute = (fromTokenId: string | null, toTokenId: string | null) =>
  ROUTES.find((route) => route.fromTokenId === fromTokenId && route.toTokenId === toTokenId)

export type BittensorEvmQuoteData = {
  direction: Direction
  fromTokenId: TokenId
  toTokenId: TokenId
  toAddress: string | null
  /** existential deposit retained by a fresh mirror account, in rao */
  edHeldRao: bigint
}

// --- Substrate helpers (no React, usable from getQuote) ---

const substrateApis = new Map<string, Promise<ScaleApi>>()

const createSubstrateApi = async (networkId: string): Promise<ScaleApi> => {
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

const getSubstrateApi = (networkId: string): Promise<ScaleApi> => {
  const cached = substrateApis.get(networkId)
  if (cached) return cached

  const created = createSubstrateApi(networkId).catch((err) => {
    substrateApis.delete(networkId)
    throw err
  })
  substrateApis.set(networkId, created)
  return created
}

const getSubstrateFreeBalance = async (networkId: string, address: string): Promise<bigint> => {
  const sapi = await getSubstrateApi(networkId)
  const account = await sapi.getStorage<{ data?: { free?: bigint } } | null>("System", "Account", [
    address,
  ])
  return account?.data?.free ?? 0n
}

const isMirrorFunded = async (networkId: string, mirror: string): Promise<boolean> => {
  try {
    const free = await getSubstrateFreeBalance(networkId, mirror)
    return free >= BITTENSOR_EXISTENTIAL_DEPOSIT_RAO
  } catch (err) {
    log.warn("Failed to read Bittensor mirror balance, assuming a fresh account", { err })
    return false
  }
}

const estimateSubstrateFeeRao = async (
  networkId: string,
  fromAddress: string
): Promise<bigint | null> => {
  try {
    const sapi = await getSubstrateApi(networkId)
    const { payload } = await sapi.getExtrinsicPayload(
      "Balances",
      "transfer_keep_alive",
      { dest: MultiAddress.Id(fromAddress), value: 0n },
      { address: fromAddress }
    )
    return await sapi.getFeeEstimate(payload)
  } catch (err) {
    log.error(new Error("Failed to estimate Bittensor transfer fee", { cause: err }))
    return null
  }
}

// --- EVM helpers ---

const getEvmNetwork = async (evmNetworkId: string) => {
  const network = await firstValueFrom(getNetworkById$(evmNetworkId))
  if (network?.platform !== "ethereum") throw new Error("Unknown EVM network")
  return network
}

const encodePrecompileTransfer = (destPubkey: `0x${string}`) =>
  encodeFunctionData({
    abi: abiBittensorBalanceTransfer,
    functionName: "transfer",
    args: [destPubkey],
  })

const estimateEvmFeeWei = async (
  evmNetworkId: string,
  fromAddress: string,
  toAddress: string | null,
  value: bigint
): Promise<bigint | null> => {
  try {
    const network = await getEvmNetwork(evmNetworkId)
    const client = getExtensionPublicClient(network)
    const destPubkey = toAddress ? frontierSs58ToPublicKeyHex(toAddress) : zeroHash
    const [gasPrice, gasLimit] = await Promise.all([
      client.getGasPrice(),
      client.estimateGas({
        account: fromAddress as `0x${string}`,
        to: BITTENSOR_BALANCE_TRANSFER_PRECOMPILE,
        data: encodePrecompileTransfer(destPubkey),
        value,
      }),
    ])
    return gasPrice * gasLimit
  } catch (err) {
    log.error(new Error("Failed to estimate Bittensor EVM transfer gas", { cause: err }))
    return null
  }
}

// --- Quote ---

const toQuoteFee = (tokenId: TokenId, planck: bigint, decimals: number): QuoteFee => ({
  name: "Est. Gas Fees",
  tokenId,
  amount: BigNumber(planckToTokens(planck.toString(), decimals)),
})

const throwMinimumError = async (tokenId: TokenId, minimum: bigint, decimals: number) => {
  const token = await firstValueFrom(getToken$(tokenId))
  const symbol = token?.symbol ?? "TAO"
  throw new Error(
    `${PROTOCOL_NAME} minimum is ${planckToTokens(minimum.toString(), decimals)} ${symbol}`
  )
}

const buildQuote = (
  route: Route,
  inputAmountBN: bigint,
  outputAmountBN: bigint,
  fees: QuoteFee[],
  data: BittensorEvmQuoteData,
  note?: string
): BaseQuote<BittensorEvmQuoteData> => ({
  protocol: PROTOCOL,
  decentralisationScore: DECENTRALISATION_SCORE,
  inputAmountBN,
  outputAmountBN,
  fees,
  timeInSec: ESTIMATED_DURATION_SEC,
  providerLogo: bittensorLogo,
  providerName: PROTOCOL_NAME,
  note,
  data: { ...data, fromTokenId: route.fromTokenId, toTokenId: route.toTokenId },
})

const getSubToEvmQuote = async (
  route: Route,
  fromAmount: bigint,
  fromAddress: string | null,
  toAddress: string | null
): Promise<BaseQuote<BittensorEvmQuoteData>> => {
  const { substrateNetworkId } = route.pair

  const mirror =
    toAddress && isEthereumAddress(toAddress)
      ? frontierH160ToSs58Mirror(toAddress, BITTENSOR_SS58_PREFIX)
      : null
  const funded = mirror ? await isMirrorFunded(substrateNetworkId, mirror) : false
  const edHeldRao = funded ? 0n : BITTENSOR_EXISTENTIAL_DEPOSIT_RAO

  // the fee is paid on top by the sender, the confirmation screen checks it against the balance
  const minimum = edHeldRao + BITTENSOR_EXISTENTIAL_DEPOSIT_RAO
  if (fromAmount < minimum) await throwMinimumError(route.fromTokenId, minimum, TAO_DECIMALS)

  const feeRao = fromAddress ? await estimateSubstrateFeeRao(substrateNetworkId, fromAddress) : null
  const outputRao = fromAmount - edHeldRao
  const fees = feeRao !== null ? [toQuoteFee(route.fromTokenId, feeRao, TAO_DECIMALS)] : []
  const note = edHeldRao
    ? `${planckToTokens(edHeldRao.toString(), TAO_DECIMALS)} TAO stays locked in the EVM account as existential deposit`
    : undefined

  return buildQuote(
    route,
    fromAmount,
    outputRao * BITTENSOR_WEI_PER_RAO,
    fees,
    {
      direction: "sub-to-evm",
      fromTokenId: route.fromTokenId,
      toTokenId: route.toTokenId,
      toAddress,
      edHeldRao,
    },
    note
  )
}

const getEvmToSubQuote = async (
  route: Route,
  fromAmount: bigint,
  fromAddress: string | null,
  toAddress: string | null
): Promise<BaseQuote<BittensorEvmQuoteData>> => {
  const { evmNetworkId } = route.pair

  const outputRao = fromAmount / BITTENSOR_WEI_PER_RAO
  const value = outputRao * BITTENSOR_WEI_PER_RAO

  // gas is paid on top by the sender, the confirmation screen checks it against the balance
  const minimum = BITTENSOR_EXISTENTIAL_DEPOSIT_RAO * BITTENSOR_WEI_PER_RAO
  if (fromAmount < minimum) await throwMinimumError(route.fromTokenId, minimum, EVM_TAO_DECIMALS)

  const feeWei =
    fromAddress && isEthereumAddress(fromAddress)
      ? await estimateEvmFeeWei(evmNetworkId, fromAddress, toAddress, value)
      : null
  const fees = feeWei !== null ? [toQuoteFee(route.fromTokenId, feeWei, EVM_TAO_DECIMALS)] : []

  return buildQuote(route, fromAmount, outputRao, fees, {
    direction: "evm-to-sub",
    fromTokenId: route.fromTokenId,
    toTokenId: route.toTokenId,
    toAddress,
    edHeldRao: 0n,
  })
}

const getQuote = async (params: QuoteParams): Promise<BaseQuote | null> => {
  const { fromTokenId, toTokenId, fromAmount, fromAddress, toAddress } = params

  const route = findRoute(fromTokenId, toTokenId)
  if (!route || !fromAmount || fromAmount <= 0n) return null

  return route.direction === "sub-to-evm"
    ? getSubToEvmQuote(route, fromAmount, fromAddress, toAddress)
    : getEvmToSubQuote(route, fromAmount, fromAddress, toAddress)
}

// --- Transaction ---

const getTransaction = async (
  params: GetTransactionParams
): Promise<SwapModuleTransaction | null> => {
  const { fromTokenId, fromAddress, fromAmount, exchange, context, toAddress } = params

  const data = (exchange as BaseQuote<BittensorEvmQuoteData> | undefined)?.data
  if (!data?.toAddress || data.fromTokenId !== fromTokenId)
    throw new Error("Please select the quote again")
  if (toAddress && !isAddressEqual(toAddress, data.toAddress))
    throw new Error("Please select the quote again")

  const route = findRoute(data.fromTokenId, data.toTokenId)
  if (!route || route.direction !== data.direction) throw new Error("Please select the quote again")

  if (route.direction === "sub-to-evm") {
    if (context.platform !== "polkadot") throw new Error("Missing substrate context")
    if (!isEthereumAddress(data.toAddress)) throw new Error("Invalid recipient")

    const mirror = frontierH160ToSs58Mirror(data.toAddress, BITTENSOR_SS58_PREFIX)
    const { payload, txMetadata } = await context.sapi.getExtrinsicPayload(
      "Balances",
      context.allowReap ? "transfer_allow_death" : "transfer_keep_alive",
      { dest: MultiAddress.Id(mirror), value: fromAmount },
      { address: fromAddress }
    )
    return { platform: "polkadot", payload, txMetadata }
  }

  if (context.platform !== "ethereum") throw new Error("Missing EVM context")
  if (!isEthereumAddress(fromAddress)) throw new Error("Invalid sender address")

  const value = (fromAmount / BITTENSOR_WEI_PER_RAO) * BITTENSOR_WEI_PER_RAO
  assertNativeValueWithinInput({ value, fromAmount, isNativeInput: true })

  const network = await getEvmNetwork(route.pair.evmNetworkId)
  const publicClient = getExtensionPublicClient(network)

  const transaction = await prepareTransactionRequestWithGasCheck(
    publicClient,
    network.nativeTokenId,
    {
      chain: null,
      account: fromAddress,
      to: BITTENSOR_BALANCE_TRANSFER_PRECOMPILE,
      data: encodePrecompileTransfer(frontierSs58ToPublicKeyHex(data.toAddress)),
      value,
    }
  )

  return { platform: "ethereum", transaction }
}

export const bittensorEvmSwapModule: SwapModule = {
  protocol: PROTOCOL,
  decentralisationScore: DECENTRALISATION_SCORE,
  getFromAssets: async () => ROUTES.map((route) => route.fromTokenId),
  getToAssets: async (fromTokenId) =>
    ROUTES.filter((route) => !fromTokenId || route.fromTokenId === fromTokenId).map(
      (route) => route.toTokenId
    ),
  getQuote,
  createExchange: async () => null,
  getTransaction,
}
