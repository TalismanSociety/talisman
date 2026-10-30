import { db } from "@core/db"
import { isNonceHeldLocally } from "@core/domains/ethereum/nonceManager"
import type { SignerPayloadJSON } from "@core/domains/signing/types"
import type {
  WalletTransaction,
  WalletTransactionDot,
  WalletTransactionEth,
  WalletTransactionInfo,
} from "@core/domains/transactions/types"
import { type NetworkId, networkIdFromTokenId } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { hexToU8a } from "@talismn/util"
import {
  type Hex,
  keccak256,
  parseTransaction,
  recoverTransactionAddress,
  type TransactionRequest,
  type TransactionSerialized,
} from "viem"
import { legCandidates } from "../candidates"
import { coreSwapEnv } from "../env.core"
import { getPlanLegRuntime } from "../registry"
import type { LegBound, LegReplacement, SentEvidence, SubstrateCallViolation } from "../types"
import { isAdmissible, transition } from "./machine"
import { type AppliedEvent, enqueue, getPlan, putPlan } from "./store"
import type { LegState, PlanLeg, SwapPlan, SwapPlanRef } from "./types"

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

/** a leg the user signs on screen shows its output, so a rate drop since the plan started is theirs to accept */
const signedBound = (bound: LegBound, leg: PlanLeg): LegBound =>
  leg.state.at === "awaiting-user" ? { ...bound, floor: "0" } : bound

const checkUnbound = (leg: PlanLeg, signer: Hex): BoundViolation | null =>
  isAddressEqual(signer, leg.quote.signer) ? null : "signer"

export type SubstrateLegViolation = "network" | "signer" | "nonce" | SubstrateCallViolation | "era"

/** The signed payload against the leg: its network, signer and nonce. The leg's module checks the call */
export const checkSubstrateLeg = (
  leg: PlanLeg,
  networkId: NetworkId,
  payload: SignerPayloadJSON
): SubstrateLegViolation | null => {
  if (networkIdFromTokenId(leg.quote.fromTokenId) !== networkId) return "network"
  if (!isAddressEqual(payload.address, leg.quote.signer)) return "signer"
  if (leg.nonce !== undefined && Number(payload.nonce) !== leg.nonce) return "nonce"
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
  /** the signed transaction against the plan as it stands inside the queue */
  check: (plan: SwapPlan) => BoundViolation | SubstrateLegViolation | null
  /** another transaction took the nonce the leg was signed on, which the plan does not pin */
  isNonceTaken?: () => Promise<boolean>
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
      if (leg.nonce === undefined && (await admission.isNonceTaken?.()))
        throw new PlanNotAdmissible("This transaction is out of date, sign it again")
      const violation = admission.check(plan)
      if (violation) throw new PlanBoundViolation(violation)

      const { check: _, isNonceTaken: __, ...admitted } = admission
      const result = transition(plan, { type: "admitted", leg: ref.leg, ...admitted }, now)
      await putPlan(result.plan)
      await db.transactionsV2.put(admission.row)
      return result
    })
  )

const planTxInfo = (txInfo: WalletTransactionInfo, ref: SwapPlanRef): WalletTransactionInfo => ({
  ...txInfo,
  plan: ref,
})

/** the chain's count is read up front: the check itself runs inside the admission's Dexie transaction */
const nonceTakenCheck = async (signer: Hex, networkId: NetworkId, nonce: number) => {
  const client = await coreSwapEnv.evmClient(networkId)
  const chainNonce = await client.getTransactionCount({ address: signer })
  return async () => chainNonce > nonce || (await isNonceHeldLocally(signer, networkId, nonce))
}

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
  const runtime = getPlanLegRuntime(leg.quote.protocol)

  const signer = await recoverTransactionAddress({
    serializedTransaction: raw as TransactionSerialized,
  })
  const tx = parseTransaction(raw as TransactionSerialized)
  const check = (current: SwapPlan) => {
    const currentLeg = current.legs[ref.leg]
    return currentLeg.bound
      ? checkBound(signedBound(currentLeg.bound, currentLeg), tx, signer)
      : checkUnbound(currentLeg, signer)
  }
  const violation = check(plan)
  if (violation) throw new PlanBoundViolation(violation)
  if (tx.nonce === undefined) throw new PlanBoundViolation("nonce")
  const nonce = tx.nonce
  const isNonceTaken =
    leg.nonce === undefined ? await nonceTakenCheck(signer, networkId, nonce) : undefined

  const now = Date.now()
  const hash = keccak256(raw)
  const row: WalletTransactionEth = {
    id: hash,
    hash,
    platform: "ethereum",
    networkId,
    account: signer,
    nonce,
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
      check,
      isNonceTaken,
      hash,
      nonce,
      deadlineAt: now + runtime.legDeadlineMs,
      evidence: { platform: "ethereum", raw },
      row,
    },
    now
  )
}

type ReplacementViolation =
  | "network"
  | "chainId"
  | "signer"
  | "nonce"
  | "authorizationList"
  | "call"

type SentLegState = Extract<LegState, { at: "sent" }>

const sameCall = (a: ParsedTransaction, b: ParsedTransaction) =>
  !!a.to &&
  !!b.to &&
  isAddressEqual(a.to, b.to) &&
  (a.data ?? "0x").toLowerCase() === (b.data ?? "0x").toLowerCase() &&
  (a.value ?? 0n) === (b.value ?? 0n)

const isNoOp = (tx: ParsedTransaction, signer: Hex) =>
  !!tx.to && isAddressEqual(tx.to, signer) && (tx.value ?? 0n) === 0n && (tx.data ?? "0x") === "0x"

/**
 * What a transaction on a sent leg's nonce does: the leg's call again (a speed-up), a 0-value
 * transfer to the signer (a cancel), or anything else, which never enters the plan
 */
const checkReplacement = (
  leg: PlanLeg,
  original: ParsedTransaction,
  networkId: NetworkId,
  tx: ParsedTransaction,
  signer: Hex
): { kind: LegReplacement["kind"]; nonce: number } | { violation: ReplacementViolation } => {
  const { nonce } = leg
  if (networkIdFromTokenId(leg.quote.fromTokenId) !== networkId) return { violation: "network" }
  if (tx.chainId !== original.chainId) return { violation: "chainId" }
  if (!isAddressEqual(signer, leg.quote.signer)) return { violation: "signer" }
  if (nonce === undefined || tx.nonce !== nonce) return { violation: "nonce" }
  if ("authorizationList" in tx && tx.authorizationList) return { violation: "authorizationList" }
  if (sameCall(tx, original)) return { kind: "speed-up", nonce }
  if (isNoOp(tx, signer)) return { kind: "cancel", nonce }
  return { violation: "call" }
}

/** every EVM leg is admitted with its signed bytes, they are what a replacement is checked against */
const originalOf = (state: SentLegState) => {
  if (state.evidence.platform !== "ethereum" || !state.evidence.raw)
    throw new PlanNotAdmissible("The leg's transaction is unknown")
  return parseTransaction(state.evidence.raw as TransactionSerialized)
}

/**
 * Admits the user's speed-up or cancel of a sent EVM leg: the leg then waits on whichever of its
 * transactions executes. Checked against the leg inside its queue, recorded with its row before
 * any broadcast. Admitting the same bytes twice is a no-op, so a crash before the broadcast converges.
 */
export const admitEvmReplacement = async (
  ref: SwapPlanRef,
  { raw, networkId, unsigned, txInfo }: EvmLegTx
): Promise<AppliedEvent> => {
  const signer = await recoverTransactionAddress({
    serializedTransaction: raw as TransactionSerialized,
  })
  const tx = parseTransaction(raw as TransactionSerialized)
  const hash = keccak256(raw)

  return enqueue(ref.id, () =>
    db.transaction("rw", db.swapPlans, db.transactionsV2, async () => {
      const now = Date.now()
      const plan = await getPlan(ref.id)
      const leg = plan?.legs[ref.leg]
      if (!plan || !leg) throw new PlanNotAdmissible("Unknown swap plan leg")
      if (leg.state.at !== "sent") throw new PlanNotAdmissible("The leg has no pending transaction")
      if (legCandidates(leg.state).some((candidate) => candidate.hash === hash))
        return { plan, effects: [] }

      const check = checkReplacement(leg, originalOf(leg.state), networkId, tx, signer)
      if ("violation" in check) throw new PlanBoundViolation(check.violation)

      const runtime = getPlanLegRuntime(leg.quote.protocol)
      const result = transition(
        plan,
        {
          type: "replacement-admitted",
          leg: ref.leg,
          replacement: { kind: check.kind, hash, raw, sentAt: now },
          deadlineAt: now + runtime.legDeadlineMs,
        },
        now
      )
      if (result.plan === plan) throw new PlanNotAdmissible("The leg has no pending transaction")
      await putPlan(result.plan)
      await db.transactionsV2.put({
        id: hash,
        hash,
        platform: "ethereum",
        networkId,
        account: signer,
        nonce: check.nonce,
        isReplacement: true,
        payload: unsigned,
        status: "pending",
        confirmed: false,
        label: "Transaction",
        txInfo: planTxInfo(txInfo, ref),
        timestamp: now,
      })
      return result
    })
  )
}

/** A signed EVM transaction of a plan: the leg's own while it waits for one, else the user's replacement of it */
export const admitPlanEvmTx = async (
  ref: SwapPlanRef,
  tx: EvmLegTx
): Promise<{ replaces: boolean }> => {
  const replaces = (await getPlan(ref.id))?.legs[ref.leg]?.state.at === "sent"
  await (replaces ? admitEvmReplacement(ref, tx) : admitEvmLeg(ref, tx))
  return { replaces }
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
  if (!plan || !leg) throw new PlanNotAdmissible("Unknown swap plan leg")
  const runtime = getPlanLegRuntime(leg.quote.protocol)
  const { checkSubstrateCall } = runtime
  if (!checkSubstrateCall)
    throw new PlanNotAdmissible(`${leg.quote.protocol} has no substrate legs`)

  const sapi = await coreSwapEnv.substrateApi(networkId)
  const call = sapi.getDecodedCallFromPayload({ method: payload.method })
  const check = (current: SwapPlan) => {
    const currentLeg = current.legs[ref.leg]
    return (
      checkSubstrateLeg(currentLeg, networkId, payload) ??
      checkSubstrateCall({
        leg: currentLeg.quote,
        next: current.legs[ref.leg + 1]?.quote,
        call,
      })
    )
  }
  const violation = check(plan)
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
      check,
      hash,
      nonce,
      deadlineAt: now + runtime.legDeadlineMs,
      evidence: { platform: "polkadot", era },
      row,
    },
    now
  )
}
