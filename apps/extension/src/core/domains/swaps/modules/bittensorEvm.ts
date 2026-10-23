import { log } from "@common/log"
import {
  BITTENSOR_BALANCE_TRANSFER_PRECOMPILE,
  BITTENSOR_EVM_PAIRS,
  BITTENSOR_EXISTENTIAL_DEPOSIT_RAO,
  BITTENSOR_SS58_PREFIX,
  BITTENSOR_WEI_PER_RAO,
  type BittensorEvmPair,
} from "@core/domains/bittensor/constants"
import type { SwapEnv } from "@core/domains/swaps/env"
import { getEvmNetwork, quoteFromLegs } from "@core/domains/swaps/helpers"
import type {
  BackgroundSwapModule,
  BaseQuote,
  BuildLegParams,
  BuiltLeg,
  QuoteFee,
  QuoteParams,
  SupportedSwapProtocol,
  SwapModuleTransaction,
  SwapTransactionContext,
} from "@core/domains/swaps/types"
import { abiBittensorBalanceTransfer } from "@core/util/abi"
import { MultiAddress } from "@polkadot-api/descriptors"
import { evmNativeTokenId, subNativeTokenId, type TokenId } from "@talismn/chaindata-provider"
import {
  frontierH160ToSs58Mirror,
  frontierSs58ToPublicKeyHex,
  isEthereumAddress,
} from "@talismn/crypto"
import { planckToTokens } from "@talismn/util"
import BigNumber from "bignumber.js"
import { encodeFunctionData, zeroHash } from "viem"
import { prepareTransactionRequestWithGasCheck } from "../evm-gas-check"
import { assertNativeValueWithinInput } from "../provider-transaction-guards"
import bittensorLogo from "./bittensor-logo.svg?url"

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

// --- Substrate helpers ---

const getSubstrateFreeBalance = async (
  env: SwapEnv,
  networkId: string,
  address: string
): Promise<bigint> => {
  const sapi = await env.substrateApi(networkId)
  const account = await sapi.getStorage<{ data?: { free?: bigint } } | null>("System", "Account", [
    address,
  ])
  return account?.data?.free ?? 0n
}

const isMirrorFunded = async (
  env: SwapEnv,
  networkId: string,
  mirror: string
): Promise<boolean> => {
  try {
    const free = await getSubstrateFreeBalance(env, networkId, mirror)
    return free >= BITTENSOR_EXISTENTIAL_DEPOSIT_RAO
  } catch (err) {
    log.warn("Failed to read Bittensor mirror balance, assuming a fresh account", { err })
    return false
  }
}

const estimateSubstrateFeeRao = async (
  env: SwapEnv,
  networkId: string,
  fromAddress: string
): Promise<bigint | null> => {
  try {
    const sapi = await env.substrateApi(networkId)
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

const encodePrecompileTransfer = (destPubkey: `0x${string}`) =>
  encodeFunctionData({
    abi: abiBittensorBalanceTransfer,
    functionName: "transfer",
    args: [destPubkey],
  })

const estimateEvmFeeWei = async (
  env: SwapEnv,
  evmNetworkId: string,
  fromAddress: string,
  toAddress: string | null,
  value: bigint
): Promise<bigint | null> => {
  try {
    const client = await env.evmClient(evmNetworkId)
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

const throwMinimumError = async (
  env: SwapEnv,
  tokenId: TokenId,
  minimum: bigint,
  decimals: number
) => {
  const token = await env.getToken(tokenId)
  const symbol = token?.symbol ?? "TAO"
  throw new Error(
    `${PROTOCOL_NAME} minimum is ${planckToTokens(minimum.toString(), decimals)} ${symbol}`
  )
}

const buildQuote = (
  route: Route,
  signer: string | null,
  recipient: string | null,
  inputAmount: bigint,
  outputAmount: bigint,
  fees: QuoteFee[],
  note?: string
): BaseQuote =>
  quoteFromLegs(
    [
      {
        protocol: PROTOCOL,
        fromTokenId: route.fromTokenId,
        toTokenId: route.toTokenId,
        signer,
        recipient,
        inputAmount,
        outputAmount,
        fees,
        timeInSec: ESTIMATED_DURATION_SEC,
      },
    ],
    {
      protocol: PROTOCOL,
      decentralisationScore: DECENTRALISATION_SCORE,
      providerLogo: bittensorLogo,
      providerName: PROTOCOL_NAME,
      note,
    }
  )

const getSubToEvmQuote = async (
  env: SwapEnv,
  route: Route,
  fromAmount: bigint,
  fromAddress: string | null,
  toAddress: string | null
): Promise<BaseQuote> => {
  const { substrateNetworkId } = route.pair

  const mirror =
    toAddress && isEthereumAddress(toAddress)
      ? frontierH160ToSs58Mirror(toAddress, BITTENSOR_SS58_PREFIX)
      : null
  const funded = mirror ? await isMirrorFunded(env, substrateNetworkId, mirror) : false
  const edHeldRao = funded ? 0n : BITTENSOR_EXISTENTIAL_DEPOSIT_RAO

  // the fee is paid on top by the sender, the confirmation screen checks it against the balance
  const minimum = edHeldRao + BITTENSOR_EXISTENTIAL_DEPOSIT_RAO
  if (fromAmount < minimum) await throwMinimumError(env, route.fromTokenId, minimum, TAO_DECIMALS)

  const feeRao = fromAddress
    ? await estimateSubstrateFeeRao(env, substrateNetworkId, fromAddress)
    : null
  const outputRao = fromAmount - edHeldRao
  const fees = feeRao !== null ? [toQuoteFee(route.fromTokenId, feeRao, TAO_DECIMALS)] : []
  const note = edHeldRao
    ? `${planckToTokens(edHeldRao.toString(), TAO_DECIMALS)} TAO stays locked in the EVM account as existential deposit`
    : undefined

  return buildQuote(
    route,
    fromAddress,
    toAddress,
    fromAmount,
    outputRao * BITTENSOR_WEI_PER_RAO,
    fees,
    note
  )
}

const getEvmToSubQuote = async (
  env: SwapEnv,
  route: Route,
  fromAmount: bigint,
  fromAddress: string | null,
  toAddress: string | null
): Promise<BaseQuote> => {
  const { evmNetworkId } = route.pair

  const outputRao = fromAmount / BITTENSOR_WEI_PER_RAO
  const value = outputRao * BITTENSOR_WEI_PER_RAO

  // gas is paid on top by the sender, the confirmation screen checks it against the balance
  const minimum = BITTENSOR_EXISTENTIAL_DEPOSIT_RAO * BITTENSOR_WEI_PER_RAO
  if (fromAmount < minimum)
    await throwMinimumError(env, route.fromTokenId, minimum, EVM_TAO_DECIMALS)

  const feeWei =
    fromAddress && isEthereumAddress(fromAddress)
      ? await estimateEvmFeeWei(env, evmNetworkId, fromAddress, toAddress, value)
      : null
  const fees = feeWei !== null ? [toQuoteFee(route.fromTokenId, feeWei, EVM_TAO_DECIMALS)] : []

  return buildQuote(route, fromAddress, toAddress, fromAmount, outputRao, fees)
}

const getQuote = async (params: QuoteParams, env: SwapEnv): Promise<BaseQuote | null> => {
  const { fromTokenId, toTokenId, fromAmount, fromAddress, toAddress } = params

  const route = findRoute(fromTokenId, toTokenId)
  if (!route || !fromAmount || fromAmount <= 0n) return null

  return route.direction === "sub-to-evm"
    ? getSubToEvmQuote(env, route, fromAmount, fromAddress, toAddress)
    : getEvmToSubQuote(env, route, fromAmount, fromAddress, toAddress)
}

// --- Transaction ---

const buildTransaction = async (
  env: SwapEnv,
  route: Route,
  signer: string,
  recipient: string,
  input: bigint,
  context: SwapTransactionContext
): Promise<SwapModuleTransaction> => {
  if (route.direction === "sub-to-evm") {
    if (context.platform !== "polkadot") throw new Error("Missing substrate context")
    if (!isEthereumAddress(recipient)) throw new Error("Invalid recipient")

    const mirror = frontierH160ToSs58Mirror(recipient, BITTENSOR_SS58_PREFIX)
    const { payload, txMetadata } = await context.sapi.getExtrinsicPayload(
      "Balances",
      context.allowReap ? "transfer_allow_death" : "transfer_keep_alive",
      { dest: MultiAddress.Id(mirror), value: input },
      { address: signer }
    )
    return { platform: "polkadot", payload, txMetadata }
  }

  if (context.platform !== "ethereum") throw new Error("Missing EVM context")
  if (!isEthereumAddress(signer)) throw new Error("Invalid sender address")

  const value = (input / BITTENSOR_WEI_PER_RAO) * BITTENSOR_WEI_PER_RAO
  assertNativeValueWithinInput({ value, fromAmount: input, isNativeInput: true })

  const [network, publicClient] = await Promise.all([
    getEvmNetwork(env, route.pair.evmNetworkId),
    env.evmClient(route.pair.evmNetworkId),
  ])

  const transaction = await prepareTransactionRequestWithGasCheck(
    publicClient,
    network.nativeTokenId,
    {
      chain: null,
      account: signer,
      to: BITTENSOR_BALANCE_TRANSFER_PRECOMPILE,
      data: encodePrecompileTransfer(frontierSs58ToPublicKeyHex(recipient)),
      value,
    }
  )

  return { platform: "ethereum", transaction }
}

const buildLeg = async (
  { leg, input, context }: BuildLegParams,
  env: SwapEnv
): Promise<BuiltLeg> => {
  const route = findRoute(leg.fromTokenId, leg.toTokenId)
  if (!route || !leg.signer || !leg.recipient) throw new Error("Please select the quote again")

  return {
    transaction: await buildTransaction(env, route, leg.signer, leg.recipient, input, context),
    fees: leg.fees,
    expectedOutput: leg.outputAmount,
    txInfo: {
      type: "swap-bittensor-evm",
      fromTokenId: leg.fromTokenId,
      toTokenId: leg.toTokenId,
      fromAmount: input.toString(),
      toAmount: leg.outputAmount.toString(),
      to: leg.recipient,
    },
  }
}

export const bittensorEvmSwapModule: BackgroundSwapModule = {
  protocol: PROTOCOL,
  decentralisationScore: DECENTRALISATION_SCORE,
  getFromAssets: async () => ROUTES.map((route) => route.fromTokenId),
  getToAssets: async (fromTokenId) =>
    ROUTES.filter((route) => !fromTokenId || route.fromTokenId === fromTokenId).map(
      (route) => route.toTokenId
    ),
  getQuote,
  buildLeg,
}
