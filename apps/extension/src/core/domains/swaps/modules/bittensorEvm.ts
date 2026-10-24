import { log } from "@common/log"
import {
  BITTENSOR_BALANCE_TRANSFER_PRECOMPILE,
  BITTENSOR_EVM_PAIRS,
  BITTENSOR_EXISTENTIAL_DEPOSIT_RAO,
  BITTENSOR_SS58_PREFIX,
  BITTENSOR_WEI_PER_RAO,
  type BittensorEvmPair,
} from "@core/domains/bittensor/constants"
import type { ExtrinsicEvents, SwapEnv } from "@core/domains/swaps/env"
import { getEvmNetwork, getFinalizedHead, quoteFromLegs } from "@core/domains/swaps/helpers"
import type {
  BackgroundSwapModule,
  BaseQuote,
  BuildLegParams,
  BuiltLeg,
  LegObservation,
  ObserveLegParams,
  QuoteFee,
  QuoteLeg,
  QuoteParams,
  SentLeg,
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
import { encodeFunctionData, type Hex, zeroHash } from "viem"
import { prepareTransactionRequestWithGasCheck } from "../evm-gas-check"
import { observeEvmLeg } from "../observeEvm"
import { assertNativeValueWithinInput } from "../provider-transaction-guards"
import bittensorLogo from "./bittensor-logo.svg?url"

const PROTOCOL: SupportedSwapProtocol = "bittensor-evm"
const PROTOCOL_NAME = "Bittensor EVM"
const DECENTRALISATION_SCORE = 3
const ESTIMATED_DURATION_SEC = 12
const TAO_DECIMALS = 9
const EVM_TAO_DECIMALS = 18
/** a 64-block mortal era at 12 s plus finality */
const LEG_DEADLINE_MS = 20 * 60_000

type Direction = "sub-to-evm" | "evm-to-sub"

type Route = {
  direction: Direction
  pair: BittensorEvmPair
  fromTokenId: TokenId
  toTokenId: TokenId
}

/** what a substrate to EVM leg carries from its quote to its observation */
type SubToEvmLegData = { edHeldRao: string }

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
  extra: Pick<QuoteLeg, "data"> & Pick<BaseQuote, "note"> = {}
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
        ...(extra.data === undefined ? {} : { data: extra.data }),
      },
    ],
    {
      protocol: PROTOCOL,
      decentralisationScore: DECENTRALISATION_SCORE,
      providerLogo: bittensorLogo,
      providerName: PROTOCOL_NAME,
      note: extra.note,
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
  const data: SubToEvmLegData = { edHeldRao: edHeldRao.toString() }

  return buildQuote(
    route,
    fromAddress,
    toAddress,
    fromAmount,
    outputRao * BITTENSOR_WEI_PER_RAO,
    fees,
    { note, data }
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

// --- Observation ---

const edHeldRaoOf = (leg: QuoteLeg) => {
  const data = leg.data as Partial<SubToEvmLegData> | undefined
  return data?.edHeldRao ? BigInt(data.edHeldRao) : 0n
}

const landedFromTransfer = (leg: QuoteLeg, found: ExtrinsicEvents): LegObservation => {
  if (!found.success) return { status: "failed", reason: "reverted" }
  const transfer = found.events.find(
    (event) => event.pallet === "Balances" && event.name === "Transfer"
  )
  const amountRao = (transfer?.value as { amount?: bigint } | undefined)?.amount
  if (amountRao === undefined) return { status: "failed", reason: "indeterminate" }
  return { status: "landed", amount: (amountRao - edHeldRaoOf(leg)) * BITTENSOR_WEI_PER_RAO }
}

const getNonceAt = async (env: SwapEnv, networkId: string, address: string, blockHash: Hex) => {
  const sapi = await env.substrateApi(networkId)
  const account = await sapi.getStorage<{ nonce?: number } | null>(
    "System",
    "Account",
    [address],
    blockHash
  )
  return account ? (account.nonce ?? 0) : null
}

/**
 * the finalised blocks of the era not read yet, newest first, the row's block leading when the row
 * names one
 */
const candidateBlocks = (sent: SentLeg, birth: number, period: number, finalised: number) => {
  const last = Math.min(birth + period - 1, finalised)
  const scanned = new Set(sent.evidence.platform === "polkadot" ? sent.evidence.scanned : [])
  const era = Array.from({ length: Math.max(0, last - birth + 1) }, (_, i) => last - i).filter(
    (number) => !scanned.has(number)
  )
  const row = sent.row
  const hint =
    row?.status === "success" && row.platform === "polkadot" && row.blockNumber
      ? Number(row.blockNumber)
      : null
  return hint !== null && era.includes(hint)
    ? [hint, ...era.filter((number) => number !== hint)]
    : era
}

/**
 * complete: every block was read, so a miss proves the extrinsic is in none of them.
 * scanned: the blocks read without the extrinsic
 */
type BlockScan = { found: ExtrinsicEvents | null; complete: boolean; scanned: number[] }

/** an observation that runs out of time leaves the rest of the era to the next one */
const SCAN_BUDGET_MS = 30_000

const scanBlocks = async (
  env: SwapEnv,
  networkId: string,
  blocks: number[],
  extrinsicHash: Hex
): Promise<BlockScan> => {
  const scanUntil = Date.now() + SCAN_BUDGET_MS
  const scanned: number[] = []
  let firstError: unknown = null
  let complete = true
  for (const number of blocks) {
    if (Date.now() >= scanUntil) {
      complete = false
      break
    }
    try {
      const blockHash = await env.substrateSend<Hex | null>(networkId, "chain_getBlockHash", [
        number,
      ])
      if (!blockHash) {
        complete = false
        continue
      }
      const found = await env.decodeExtrinsicEvents(networkId, blockHash, extrinsicHash)
      if (found) return { found, complete: true, scanned }
      scanned.push(number)
    } catch (err) {
      firstError ??= err
      complete = false
    }
  }
  if (firstError) log.warn("Failed to read a block of the era for the swap leg", { firstError })
  return { found: null, complete, scanned }
}

/**
 * Landed means the extrinsic sits in a finalised block with ExtrinsicSuccess. While the era lives,
 * a signer nonce that has not moved past the leg's nonce means nothing executed yet. Otherwise the
 * era's finalised blocks are read for the extrinsic, and only that extrinsic proves the funds came
 * from this leg. Once the era is dead and every block of it was read without the extrinsic, the leg
 * is dropped when the nonce is still unused, else indeterminate. A block that could not be read, or
 * a scan that ran out of time, keeps the leg pending, for the next observation or the leg deadline.
 * The next observation reads only the blocks this one did not.
 */
const observeSubToEvmLeg = async (
  env: SwapEnv,
  route: Route,
  { leg, sent }: ObserveLegParams
): Promise<LegObservation> => {
  if (sent.evidence.platform !== "polkadot" || !leg.signer) throw new Error("Not a substrate leg")
  const { substrateNetworkId } = route.pair
  const { birth, period } = sent.evidence.era

  const head = await getFinalizedHead(env, substrateNetworkId)
  const nextNonce = await getNonceAt(env, substrateNetworkId, leg.signer, head.hash)
  const eraDead = head.number >= birth + period
  const nonceUnused = nextNonce !== null && nextNonce <= sent.nonce
  if (nonceUnused && !eraDead) return { status: "pending" }

  const scan = await scanBlocks(
    env,
    substrateNetworkId,
    candidateBlocks(sent, birth, period, head.number),
    sent.hash
  )
  if (scan.found) return landedFromTransfer(leg, scan.found)
  if (!eraDead || !scan.complete) return { status: "pending", scanned: scan.scanned }
  return nonceUnused ? { status: "dropped" } : { status: "failed", reason: "indeterminate" }
}

const observeLeg = async (params: ObserveLegParams, env: SwapEnv): Promise<LegObservation> => {
  const { leg, sent } = params
  const route = findRoute(leg.fromTokenId, leg.toTokenId)
  if (!route) throw new Error("Unknown Bittensor EVM route")
  if (route.direction === "sub-to-evm") return observeSubToEvmLeg(env, route, params)

  if (!leg.signer || !isEthereumAddress(leg.signer)) throw new Error("Invalid sender address")
  const client = await env.evmClient(route.pair.evmNetworkId)
  return observeEvmLeg(client, sent, leg.signer, ({ value }) => value / BITTENSOR_WEI_PER_RAO)
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
  legDeadlineMs: LEG_DEADLINE_MS,
  // the user signs every Bittensor EVM leg on screen
  boundLeg: async () => null,
  observeLeg,
}
