import { db } from "@core/db"
import { BITTENSOR_SS58_PREFIX } from "@core/domains/bittensor/constants"
import type { SignerPayloadJSON } from "@core/domains/signing/types"
import type {
  WalletTransaction,
  WalletTransactionDot,
  WalletTransactionEth,
  WalletTransactionInfo,
} from "@core/domains/transactions/types"
import { type NetworkId, networkIdFromTokenId } from "@talismn/chaindata-provider"
import {
  frontierH160ToSs58Mirror,
  frontierSs58ToPublicKeyHex,
  isAddressEqual,
  isEthereumAddress,
} from "@talismn/crypto"
import type { DecodedCall } from "@talismn/sapi"
import { hexToU8a } from "@talismn/util"
import {
  type Hex,
  keccak256,
  parseTransaction,
  recoverTransactionAddress,
  type TransactionRequest,
  type TransactionSerialized,
} from "viem"

import { coreSwapEnv } from "../env.core"
import { getBackgroundSwapModule } from "../registry"
import type { LegBound, SentEvidence } from "../types"
import { isAdmissible, transition } from "./machine"
import { type AppliedEvent, enqueue, getPlan, putPlan } from "./store"
import type { PlanLeg, SwapPlanRef } from "./types"

/** the signed bytes do not match what the user approved: nothing is recorded, nothing is sent */
export class PlanBoundViolation extends Error {
  readonly name = "PlanBoundViolation"
}

/** the plan has no such leg waiting for a transaction */
export class PlanNotAdmissible extends Error {
  readonly name = "PlanNotAdmissible"
}

export type BoundViolation =
  | "type"
  | "chainId"
  | "signer"
  | "to"
  | "accessList"
  | "authorizationList"
  | "spend"
  | "networkFee"
  | "calldata"
  | "floor"

type ParsedTransaction = ReturnType<typeof parseTransaction>

const SELECTOR_HEX_LENGTH = 8
const WORD_HEX_LENGTH = 64

const words = (data: Hex) => {
  const body = data.slice(2 + SELECTOR_HEX_LENGTH)
  return Array.from({ length: Math.ceil(body.length / WORD_HEX_LENGTH) }, (_, i) =>
    body.slice(i * WORD_HEX_LENGTH, (i + 1) * WORD_HEX_LENGTH)
  )
}

const selectorOf = (data: Hex) => data.slice(0, 2 + SELECTOR_HEX_LENGTH).toLowerCase()

/** The signed transaction against the approved template. Null when every pinned field holds */
export const checkBound = (
  bound: LegBound,
  tx: ParsedTransaction,
  signer: Hex
): BoundViolation | null => {
  if (tx.type !== "eip1559") return "type"
  if (tx.chainId !== bound.chainId) return "chainId"
  if (!isAddressEqual(signer, bound.signer)) return "signer"
  if (!tx.to || !isAddressEqual(tx.to, bound.to)) return "to"
  if (tx.accessList?.length) return "accessList"
  if ("authorizationList" in tx && tx.authorizationList) return "authorizationList"
  const maxGasWei = (tx.gas ?? 0n) * (tx.maxFeePerGas ?? 0n)
  if ((tx.value ?? 0n) + maxGasWei > BigInt(bound.maxSpend)) return "spend"

  const data = tx.data ?? "0x"
  const call = bound.calls.find((candidate) => selectorOf(candidate.template) === selectorOf(data))
  if (!call) return "calldata"
  if (maxGasWei > BigInt(call.maxNetworkFee)) return "networkFee"

  const actual = words(data)
  const expected = words(call.template)
  if (actual.length !== expected.length) return "calldata"
  const floor = BigInt(bound.floor)
  for (const [index, word] of actual.entries()) {
    if (call.amountSlots.includes(index)) {
      if (BigInt(`0x${word}`) < floor) return "floor"
    } else if (word.toLowerCase() !== expected[index].toLowerCase()) return "calldata"
  }
  return null
}

const checkUnbound = (leg: PlanLeg, signer: Hex): BoundViolation | null =>
  isAddressEqual(signer, leg.quote.signer) ? null : "signer"

export type SubstrateLegViolation =
  | "network"
  | "signer"
  | "nonce"
  | "call"
  | "dest"
  | "value"
  | "era"

type TransferCall = DecodedCall<{ dest?: { type?: string; value?: string }; value?: bigint }>

const TRANSFER_CALLS = ["transfer_keep_alive", "transfer_allow_death"]

/** The signed payload against the plan: a plain transfer of the approved amount to the next signer's mirror */
export const checkSubstrateLeg = (
  leg: PlanLeg,
  next: PlanLeg,
  networkId: NetworkId,
  payload: SignerPayloadJSON,
  call: TransferCall
): SubstrateLegViolation | null => {
  if (networkIdFromTokenId(leg.quote.fromTokenId) !== networkId) return "network"
  if (!isAddressEqual(payload.address, leg.quote.signer)) return "signer"
  if (leg.nonce !== undefined && Number(payload.nonce) !== leg.nonce) return "nonce"
  if (call.pallet !== "Balances" || !TRANSFER_CALLS.includes(call.method)) return "call"
  if (
    call.args.dest?.type !== "Id" ||
    !call.args.dest.value ||
    !isEthereumAddress(next.quote.signer)
  )
    return "dest"
  const mirror = frontierH160ToSs58Mirror(next.quote.signer, BITTENSOR_SS58_PREFIX)
  if (frontierSs58ToPublicKeyHex(call.args.dest.value) !== frontierSs58ToPublicKeyHex(mirror))
    return "dest"
  if (call.args.value !== BigInt(leg.quote.inputAmount)) return "value"
  return null
}

/** the blocks a mortal era covers, from its two SCALE bytes and the block the payload was built on */
export const decodeMortalEra = (
  era: Hex,
  blockNumber: number
): { birth: number; period: number } | null => {
  const bytes = hexToU8a(era)
  if (bytes.length !== 2) return null
  const encoded = bytes[0] + (bytes[1] << 8)
  const period = 2 << (encoded & 0x0f)
  const quantize = Math.max(period >> 12, 1)
  const phase = (encoded >> 4) * quantize
  const birth = Math.floor((Math.max(blockNumber, phase) - phase) / period) * period + phase
  return { birth, period }
}

type Admission = {
  hash: Hex
  nonce: number
  deadlineAt: number
  evidence: SentEvidence
  row: WalletTransaction
}

/**
 * Marks the leg sent and writes its transaction row in one Dexie transaction, before any broadcast.
 * Admitting the same hash twice is a no-op, so a crash between admission and broadcast converges.
 */
const admit = (ref: SwapPlanRef, admission: Admission, now: number): Promise<AppliedEvent> =>
  enqueue(ref.id, () =>
    db.transaction("rw", db.swapPlans, db.transactionsV2, async () => {
      const plan = await getPlan(ref.id)
      if (!plan) throw new PlanNotAdmissible("Unknown swap plan")
      const leg = plan.legs[ref.leg]
      if (!leg) throw new PlanNotAdmissible("Unknown swap plan leg")
      if (leg.state.at === "sent") {
        if (leg.state.hash === admission.hash) return { plan, effects: [] }
        throw new PlanNotAdmissible("The leg already has a transaction")
      }
      if (!isAdmissible(plan, ref.leg, now)) throw new PlanNotAdmissible("The leg is not due")
      if (leg.nonce !== undefined && leg.nonce !== admission.nonce)
        throw new PlanBoundViolation("nonce")

      const result = transition(plan, { type: "admitted", leg: ref.leg, ...admission }, now)
      await putPlan(result.plan)
      await db.transactionsV2.put(admission.row)
      return result
    })
  )

const planTxInfo = (txInfo: WalletTransactionInfo, ref: SwapPlanRef): WalletTransactionInfo => ({
  ...txInfo,
  plan: ref,
})

export type EvmLegTx = {
  raw: Hex
  networkId: NetworkId
  unsigned: TransactionRequest<string>
  txInfo: WalletTransactionInfo
}

/** Admits a signed EVM leg: the bytes are parsed and checked against the leg's bound first */
export const admitEvmLeg = async (
  ref: SwapPlanRef,
  { raw, networkId, unsigned, txInfo }: EvmLegTx
): Promise<AppliedEvent> => {
  const plan = await getPlan(ref.id)
  const leg = plan?.legs[ref.leg]
  if (!plan || !leg) throw new PlanNotAdmissible("Unknown swap plan leg")
  const module = getBackgroundSwapModule(leg.quote.protocol)

  const signer = await recoverTransactionAddress({
    serializedTransaction: raw as TransactionSerialized,
  })
  const tx = parseTransaction(raw as TransactionSerialized)
  const violation = leg.bound ? checkBound(leg.bound, tx, signer) : checkUnbound(leg, signer)
  if (violation) throw new PlanBoundViolation(violation)
  if (tx.nonce === undefined) throw new PlanBoundViolation("nonce")

  const now = Date.now()
  const hash = keccak256(raw)
  const row: WalletTransactionEth = {
    id: hash,
    hash,
    platform: "ethereum",
    networkId,
    account: signer,
    nonce: tx.nonce,
    isReplacement: false,
    payload: unsigned,
    status: "pending",
    confirmed: false,
    label: "Transaction",
    txInfo: planTxInfo(txInfo, ref),
    timestamp: now,
  }
  return admit(
    ref,
    {
      hash,
      nonce: tx.nonce,
      deadlineAt: now + module.legDeadlineMs,
      evidence: { platform: "ethereum", raw },
      row,
    },
    now
  )
}

export type SubstrateLegTx = {
  networkId: NetworkId
  payload: SignerPayloadJSON
  hash: Hex
  txInfo: WalletTransactionInfo
}

/** Admits a signed substrate leg: the call is decoded and checked against the plan first */
export const admitSubstrateLeg = async (
  ref: SwapPlanRef,
  { networkId, payload, hash, txInfo }: SubstrateLegTx
): Promise<AppliedEvent> => {
  const plan = await getPlan(ref.id)
  const leg = plan?.legs[ref.leg]
  const next = plan?.legs[ref.leg + 1]
  if (!plan || !leg) throw new PlanNotAdmissible("Unknown swap plan leg")
  if (!next) throw new PlanNotAdmissible("A substrate leg must hand over to a next leg")
  const module = getBackgroundSwapModule(leg.quote.protocol)

  const sapi = await coreSwapEnv.substrateApi(networkId)
  const call = sapi.getDecodedCallFromPayload<TransferCall>({ method: payload.method })
  const violation = checkSubstrateLeg(leg, next, networkId, payload, call)
  if (violation) throw new PlanBoundViolation(violation)
  const era = decodeMortalEra(payload.era, parseInt(payload.blockNumber, 16))
  if (!era) throw new PlanBoundViolation("era")

  const now = Date.now()
  const nonce = Number(payload.nonce)
  const row: WalletTransactionDot = {
    id: hash,
    hash,
    platform: "polkadot",
    networkId,
    account: payload.address,
    nonce,
    payload,
    status: "pending",
    confirmed: false,
    label: "Transaction",
    txInfo: planTxInfo(txInfo, ref),
    timestamp: now,
  }
  return admit(
    ref,
    {
      hash,
      nonce,
      deadlineAt: now + module.legDeadlineMs,
      evidence: { platform: "polkadot", era },
      row,
    },
    now
  )
}
