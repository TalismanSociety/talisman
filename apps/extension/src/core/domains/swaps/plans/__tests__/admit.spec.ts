import { db } from "@core/db"
import { abiForevermoneySpokeGateway } from "@core/domains/forevermoney/abi"
import type { SignerPayloadJSON } from "@core/domains/signing/types"
import { frontierH160ToSs58Mirror } from "@talismn/crypto"
import { mortal, toPjsHex } from "@talismn/sapi"
import { u8aToHex } from "@talismn/util"
import {
  encodeFunctionData,
  type Hex,
  keccak256,
  parseTransaction,
  recoverTransactionAddress,
  type TransactionRequest,
  type TransactionSerializable,
  type TransactionSerialized,
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { mockDecodedCall, mockTransactionCount } = vi.hoisted(() => ({
  mockDecodedCall: vi.fn(),
  mockTransactionCount: vi.fn(),
}))

vi.mock("../../env.core", () => ({
  coreSwapEnv: {
    substrateApi: async () => ({ getDecodedCallFromPayload: mockDecodedCall }),
    evmClient: async () => ({ getTransactionCount: mockTransactionCount }),
  },
}))

import {
  admitEvmLeg,
  admitEvmReplacement,
  admitPlanEvmTx,
  admitSubstrateLeg,
  checkBound,
  checkSubstrateLeg,
  decodeMortalEra,
  PlanBoundViolation,
  PlanNotAdmissible,
} from "../admit"
import { SIGN_WINDOW_MS } from "../machine"
import { applyPlanEvent, getPlan, proposePlan, putPlan } from "../store"
import type { SwapPlan } from "../types"
import {
  ADMIT_LEG0,
  BOUND,
  bridgeOutData,
  CCIP_FEE_WITH_BUFFER,
  EVM_ADDRESS,
  EVM_PRIVATE_KEY,
  GATEWAY,
  LEG0,
  LEG0_LANDED,
  LEG1,
  LEG1_AMOUNT,
  PLAN_ID,
  PROPOSAL,
  RECIPIENT,
  SUB_ADDRESS,
  T0,
} from "./fixtures"

const account = privateKeyToAccount(EVM_PRIVATE_KEY)
const OTHER_ACCOUNT = privateKeyToAccount(`0x${"22".repeat(32)}`)

const LEG1_TX: TransactionSerializable = {
  type: "eip1559",
  chainId: 964,
  nonce: 12,
  to: GATEWAY,
  data: bridgeOutData(LEG1_AMOUNT),
  value: LEG1_AMOUNT + CCIP_FEE_WITH_BUFFER,
  gas: 650_000n,
  maxFeePerGas: 10n,
  maxPriorityFeePerGas: 1n,
}

const signed = (overrides: Partial<TransactionSerializable> = {}, signer = account) =>
  signer.signTransaction({ ...LEG1_TX, ...overrides } as TransactionSerializable)

const violationOf = async (raw: Hex) =>
  checkBound(
    BOUND,
    parseTransaction(raw as TransactionSerialized),
    await recoverTransactionAddress({ serializedTransaction: raw as TransactionSerialized })
  )

const UNSIGNED: TransactionRequest<string> = {
  from: EVM_ADDRESS,
  to: GATEWAY,
  data: LEG1_TX.data,
  value: LEG1_TX.value?.toString(),
  gas: "650000",
  maxFeePerGas: "10",
  maxPriorityFeePerGas: "1",
  nonce: 12,
  type: "eip1559" as const,
}

const TX_INFO = {
  type: "swap-forevermoney" as const,
  fromTokenId: LEG1.quote.fromTokenId,
  toTokenId: LEG1.quote.toTokenId,
  fromAmount: LEG1.quote.inputAmount,
  toAmount: LEG1.quote.outputAmount,
  to: RECIPIENT,
  destinationStartBlock: "50000000",
}

const evmLegTx = (raw: Hex) => ({ raw, networkId: "964", unsigned: UNSIGNED, txInfo: TX_INFO })

const planWithLeg1Building = async () => {
  await proposePlan(PROPOSAL, T0)
  await applyPlanEvent(PLAN_ID, ADMIT_LEG0, T0)
  const result = await applyPlanEvent(PLAN_ID, LEG0_LANDED, T0 + 1_000)
  return result?.plan as SwapPlan
}

describe("checkBound", () => {
  it("accepts the approved call with any amount at or above the floor", async () => {
    expect(await violationOf(await signed())).toBe(null)
    expect(
      await violationOf(
        await signed({
          data: encodeFunctionData({
            abi: (await import("@core/domains/forevermoney/abi")).abiForevermoneyAlphaGateway,
            functionName: "bridgeOut",
            args: [
              15971525489660198786n,
              "0xC5b6C1632d34901239396F5E1BDe54B342900256",
              RECIPIENT,
              BigInt(BOUND.floor),
              0n,
              BigInt(BOUND.floor) + 1n,
            ],
          }),
        })
      )
    ).toBe(null)
  })

  it.each([
    [
      "a legacy transaction",
      { type: "legacy", gasPrice: 10n, maxFeePerGas: undefined, maxPriorityFeePerGas: undefined },
      "type",
    ],
    ["another chain", { chainId: 965 }, "chainId"],
    ["another contract", { to: RECIPIENT }, "to"],
    ["an access list", { accessList: [{ address: GATEWAY, storageKeys: [] }] }, "accessList"],
    ["a value above the previous leg's output", { value: BigInt(BOUND.maxSpend) + 1n }, "spend"],
    [
      "a value and gas above the previous leg's output",
      { value: BigInt(BOUND.maxSpend) - 650_000n * 10n + 1n },
      "spend",
    ],
    ["a network fee above the cap", { gas: 700_001n, maxFeePerGas: 30n }, "networkFee"],
    [
      "another function",
      {
        data: encodeFunctionData({
          abi: abiForevermoneySpokeGateway,
          functionName: "bridgeToFinney",
          args: [
            "0xf3081494B87e8D5fb7960f066E931D1D0e6E3d67",
            LEG1_AMOUNT,
            {
              ss58: `0x${"ab".repeat(32)}`,
              evmFallback: EVM_ADDRESS,
              wantLiquid: true,
              minTaoOut: LEG1_AMOUNT,
            },
            3_500_000n,
          ],
        }),
      },
      "calldata",
    ],
    ["another recipient", { data: bridgeOutData(LEG1_AMOUNT, EVM_ADDRESS) }, "calldata"],
    [
      "an extra word",
      { data: `${bridgeOutData(LEG1_AMOUNT)}${"00".repeat(32)}` as Hex },
      "calldata",
    ],
    ["an amount under the floor", { data: bridgeOutData(BigInt(BOUND.floor) - 1n) }, "floor"],
  ])("rejects %s", async (_name, overrides, violation) => {
    expect(await violationOf(await signed(overrides as Partial<TransactionSerializable>))).toBe(
      violation
    )
  })

  it("rejects a minimum output under the floor", async () => {
    const data =
      `0x${bridgeOutData(LEG1_AMOUNT).slice(2, 10 + 5 * 64)}${(BigInt(BOUND.floor) - 1n).toString(16).padStart(64, "0")}` as Hex
    expect(await violationOf(await signed({ data }))).toBe("floor")
  })

  it("rejects another signer", async () => {
    expect(await violationOf(await signed({}, OTHER_ACCOUNT))).toBe("signer")
  })
})

describe("admitEvmLeg", () => {
  beforeEach(async () => {
    await db.swapPlans.clear()
    await db.transactionsV2.clear()
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(T0 + 2_000)
    mockTransactionCount.mockReset().mockResolvedValue(12)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("marks the leg sent and writes its pending row in one go", async () => {
    const before = await planWithLeg1Building()
    const raw = await signed()
    const hash = keccak256(raw)

    const { plan } = await admitEvmLeg({ id: PLAN_ID, leg: 1 }, evmLegTx(raw))

    expect(plan).toEqual({
      ...before,
      phase: "running",
      updatedAt: T0 + 2_000,
      legs: [
        before.legs[0],
        {
          ...LEG1,
          nonce: 12,
          state: {
            at: "sent",
            hash,
            sentAt: T0 + 2_000,
            deadlineAt: T0 + 2_000 + 30 * 60_000,
            evidence: { platform: "ethereum", raw },
          },
        },
      ],
    })
    expect(await db.swapPlans.get(PLAN_ID)).toEqual(plan)
    expect(await db.transactionsV2.toArray()).toEqual([
      {
        id: hash,
        hash,
        platform: "ethereum",
        networkId: "964",
        account: EVM_ADDRESS,
        nonce: 12,
        isReplacement: false,
        payload: UNSIGNED,
        status: "pending",
        confirmed: false,
        label: "Transaction",
        txInfo: { ...TX_INFO, plan: { id: PLAN_ID, leg: 1 } },
        timestamp: T0 + 2_000,
      },
    ])
  })

  it("admits the same bytes again without a second row", async () => {
    await planWithLeg1Building()
    const raw = await signed()

    const first = await admitEvmLeg({ id: PLAN_ID, leg: 1 }, evmLegTx(raw))
    const again = await admitEvmLeg({ id: PLAN_ID, leg: 1 }, evmLegTx(raw))

    expect(again.plan).toEqual(first.plan)
    expect(await db.transactionsV2.count()).toBe(1)
  })

  it("refuses a second transaction for a sent leg", async () => {
    await planWithLeg1Building()
    await admitEvmLeg({ id: PLAN_ID, leg: 1 }, evmLegTx(await signed()))

    await expect(
      admitEvmLeg({ id: PLAN_ID, leg: 1 }, evmLegTx(await signed({ nonce: 13 })))
    ).rejects.toThrow(new PlanNotAdmissible("The leg already has a transaction"))
    expect(await db.transactionsV2.count()).toBe(1)
  })

  it("refuses a leg that is not due", async () => {
    await proposePlan(PROPOSAL, T0)
    await applyPlanEvent(PLAN_ID, ADMIT_LEG0, T0)

    await expect(admitEvmLeg({ id: PLAN_ID, leg: 1 }, evmLegTx(await signed()))).rejects.toThrow(
      new PlanNotAdmissible("The leg is not due")
    )
    expect(await db.transactionsV2.count()).toBe(0)
  })

  it("refuses a building leg once the sign window closed", async () => {
    await planWithLeg1Building()
    vi.setSystemTime(T0 + SIGN_WINDOW_MS + 1)

    await expect(admitEvmLeg({ id: PLAN_ID, leg: 1 }, evmLegTx(await signed()))).rejects.toThrow(
      new PlanNotAdmissible("The leg is not due")
    )
    expect((await getPlan(PLAN_ID))?.legs[1].state.at).toBe("building")
    expect(await db.transactionsV2.count()).toBe(0)
  })

  it("records nothing when the bytes break the bound", async () => {
    const before = await planWithLeg1Building()

    await expect(
      admitEvmLeg(
        { id: PLAN_ID, leg: 1 },
        evmLegTx(await signed({ value: BigInt(BOUND.maxSpend) + 1n }))
      )
    ).rejects.toThrow(new PlanBoundViolation("spend"))
    expect(await db.swapPlans.get(PLAN_ID)).toEqual(before)
    expect(await db.transactionsV2.count()).toBe(0)
  })

  it("holds the leg to its pinned nonce", async () => {
    const plan = await planWithLeg1Building()
    await putPlan({ ...plan, legs: [plan.legs[0], { ...plan.legs[1], nonce: 11 }] })

    await expect(
      admitEvmLeg({ id: PLAN_ID, leg: 1 }, evmLegTx(await signed({ nonce: 12 })))
    ).rejects.toThrow(new PlanBoundViolation("nonce"))
  })

  it("refuses a leg signed on a nonce another pending transaction took, then admits its rebuild", async () => {
    await planWithLeg1Building()
    await db.transactionsV2.put({
      id: "0xother",
      hash: "0xother",
      platform: "ethereum",
      networkId: "964",
      account: EVM_ADDRESS.toLowerCase() as Hex,
      nonce: 12,
      isReplacement: false,
      payload: UNSIGNED,
      status: "pending",
      confirmed: false,
      label: "Transaction",
      timestamp: T0,
    })

    await expect(
      admitEvmLeg({ id: PLAN_ID, leg: 1 }, evmLegTx(await signed({ nonce: 12 })))
    ).rejects.toThrow(PlanNotAdmissible)
    expect((await getPlan(PLAN_ID))?.legs[1].state.at).toBe("building")
    expect(await db.transactionsV2.count()).toBe(1)

    const { plan } = await admitEvmLeg(
      { id: PLAN_ID, leg: 1 },
      evmLegTx(await signed({ nonce: 13 }))
    )
    expect(plan.legs[1]).toMatchObject({ nonce: 13, state: { at: "sent" } })
  })

  it("refuses a leg signed on a nonce the chain already used", async () => {
    await planWithLeg1Building()
    mockTransactionCount.mockResolvedValue(13)

    await expect(
      admitEvmLeg({ id: PLAN_ID, leg: 1 }, evmLegTx(await signed({ nonce: 12 })))
    ).rejects.toThrow(PlanNotAdmissible)
    expect(await db.transactionsV2.count()).toBe(0)
  })

  it("admits the same bytes again once the chain included them", async () => {
    await planWithLeg1Building()
    const raw = await signed()
    const first = await admitEvmLeg({ id: PLAN_ID, leg: 1 }, evmLegTx(raw))
    mockTransactionCount.mockResolvedValue(13)

    const again = await admitEvmLeg({ id: PLAN_ID, leg: 1 }, evmLegTx(raw))

    expect(again.plan).toEqual(first.plan)
  })

  it("admits an unbound hardware leg from its signer only", async () => {
    const plan = await planWithLeg1Building()
    await putPlan({
      ...plan,
      legs: [plan.legs[0], { ...plan.legs[1], bound: null, signerType: "ledger-ethereum" }],
    })

    await expect(
      admitEvmLeg({ id: PLAN_ID, leg: 1 }, evmLegTx(await signed({}, OTHER_ACCOUNT)))
    ).rejects.toThrow(new PlanBoundViolation("signer"))
    const { plan: admitted } = await admitEvmLeg({ id: PLAN_ID, leg: 1 }, evmLegTx(await signed()))
    expect(admitted.legs[1].state.at).toBe("sent")
  })
})

describe("admitEvmReplacement", () => {
  const REF = { id: PLAN_ID, leg: 1 }
  const FASTER = { maxFeePerGas: 20n, maxPriorityFeePerGas: 2n }
  const CANCEL: TransactionSerializable = {
    type: "eip1559",
    chainId: 964,
    nonce: 12,
    to: EVM_ADDRESS,
    value: 0n,
    gas: 21_000n,
    ...FASTER,
  }

  let original: Hex

  const planWithLeg1Sent = async () => {
    await planWithLeg1Building()
    original = await signed()
    return (await admitEvmLeg(REF, evmLegTx(original))).plan
  }

  const sentState = (plan: SwapPlan | undefined) => {
    const state = plan?.legs[1].state
    if (state?.at !== "sent") throw new Error("expected leg 1 sent")
    return state
  }

  beforeEach(async () => {
    await db.swapPlans.clear()
    await db.transactionsV2.clear()
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(T0 + 2_000)
    mockTransactionCount.mockReset().mockResolvedValue(12)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("keeps a speed-up of the leg's call as a candidate, with its own row", async () => {
    await planWithLeg1Sent()
    vi.setSystemTime(T0 + 60_000)
    const raw = await signed(FASTER)
    const hash = keccak256(raw)

    const { plan } = await admitEvmReplacement(REF, evmLegTx(raw))

    expect(sentState(plan)).toEqual({
      at: "sent",
      hash: keccak256(original),
      sentAt: T0 + 2_000,
      deadlineAt: T0 + 60_000 + 30 * 60_000,
      evidence: {
        platform: "ethereum",
        raw: original,
        replacements: [{ kind: "speed-up", hash, raw, sentAt: T0 + 60_000 }],
      },
    })
    expect(await db.swapPlans.get(PLAN_ID)).toEqual(plan)
    expect(await db.transactionsV2.get(hash)).toMatchObject({
      nonce: 12,
      isReplacement: true,
      status: "pending",
      txInfo: { ...TX_INFO, plan: REF },
    })
  })

  it("keeps a 0-value transfer to the signer as a cancel", async () => {
    await planWithLeg1Sent()
    const raw = await account.signTransaction(CANCEL)

    const { plan } = await admitEvmReplacement(REF, evmLegTx(raw))

    expect(sentState(plan).evidence).toMatchObject({
      replacements: [{ kind: "cancel", hash: keccak256(raw) }],
    })
    expect(await db.transactionsV2.count()).toBe(2)
  })

  it("admits the same bytes again without a second candidate or row", async () => {
    await planWithLeg1Sent()
    const raw = await signed(FASTER)

    const first = await admitEvmReplacement(REF, evmLegTx(raw))
    const again = await admitEvmReplacement(REF, evmLegTx(raw))

    expect(again.plan).toEqual(first.plan)
    expect(await db.transactionsV2.count()).toBe(2)
  })

  it.each([
    ["call", () => signed({ ...FASTER, data: bridgeOutData(LEG1_AMOUNT, EVM_ADDRESS) })],
    ["call", () => signed({ ...FASTER, value: LEG1_AMOUNT })],
    ["call", () => signed({ ...FASTER, to: RECIPIENT })],
    ["call", () => account.signTransaction({ ...CANCEL, value: 1n })],
    ["call", () => account.signTransaction({ ...CANCEL, data: "0x00" })],
    ["signer", () => signed(FASTER, OTHER_ACCOUNT)],
    ["nonce", () => signed({ ...FASTER, nonce: 13 })],
    ["chainId", () => signed({ ...FASTER, chainId: 1 })],
  ] as const)("records nothing for a replacement that breaks the %s", async (violation, sign) => {
    const before = await planWithLeg1Sent()

    await expect(admitEvmReplacement(REF, evmLegTx(await sign()))).rejects.toThrow(
      new PlanBoundViolation(violation)
    )
    expect(await db.swapPlans.get(PLAN_ID)).toEqual(before)
    expect(await db.transactionsV2.count()).toBe(1)
  })

  it("records nothing for a replacement on another network", async () => {
    const before = await planWithLeg1Sent()

    await expect(
      admitEvmReplacement(REF, { ...evmLegTx(await signed(FASTER)), networkId: "1" })
    ).rejects.toThrow(new PlanBoundViolation("network"))
    expect(await db.swapPlans.get(PLAN_ID)).toEqual(before)
  })

  it("refuses a replacement of a leg that is not sent", async () => {
    await planWithLeg1Building()

    await expect(admitEvmReplacement(REF, evmLegTx(await signed(FASTER)))).rejects.toThrow(
      new PlanNotAdmissible("The leg has no pending transaction")
    )
    expect(await db.transactionsV2.count()).toBe(0)

    const { plan: sent } = await admitEvmLeg(REF, evmLegTx(await signed()))
    const landed = await applyPlanEvent(
      PLAN_ID,
      {
        type: "observed",
        leg: 1,
        candidates: 1,
        observation: { status: "landed", hash: sentState(sent).hash, amount: LEG1_AMOUNT },
      },
      T0 + 3_000
    )
    await expect(admitEvmReplacement(REF, evmLegTx(await signed(FASTER)))).rejects.toThrow(
      new PlanNotAdmissible("The leg has no pending transaction")
    )
    expect(await db.swapPlans.get(PLAN_ID)).toEqual(landed?.plan)
  })

  it("routes a plan's transaction by its leg: the leg's own while due, a replacement once sent", async () => {
    await planWithLeg1Building()
    const own = await signed()
    expect(await admitPlanEvmTx(REF, evmLegTx(own))).toEqual({ replaces: false })
    expect(sentState(await getPlan(PLAN_ID)).hash).toBe(keccak256(own))

    expect(await admitPlanEvmTx(REF, evmLegTx(await signed(FASTER)))).toEqual({ replaces: true })
    expect(sentState(await getPlan(PLAN_ID)).evidence).toMatchObject({
      replacements: [{ kind: "speed-up" }],
    })
  })
})

const MIRROR = frontierH160ToSs58Mirror(EVM_ADDRESS, 42)
const ERA = u8aToHex(mortal({ period: 64, phase: 100 % 64 })) as Hex

const PAYLOAD = {
  address: SUB_ADDRESS,
  genesisHash: `0x${"ab".repeat(32)}`,
  blockHash: `0x${"cd".repeat(32)}`,
  method: "0x0503",
  nonce: toPjsHex(7, 4),
  era: ERA,
  blockNumber: toPjsHex(100, 4),
  specVersion: "0x00000001",
  transactionVersion: "0x00000001",
  tip: "0x00",
  signedExtensions: [],
  version: 4,
} as unknown as SignerPayloadJSON

const TRANSFER_CALL = {
  pallet: "Balances",
  method: "transfer_keep_alive",
  args: { dest: { type: "Id", value: MIRROR }, value: 1_000_000_000n },
}

describe("checkSubstrateLeg", () => {
  it("accepts a transfer of the approved amount to the next signer's mirror", () => {
    expect(checkSubstrateLeg(LEG0, LEG1, "bittensor", PAYLOAD, TRANSFER_CALL)).toBe(null)
    expect(
      checkSubstrateLeg(LEG0, LEG1, "bittensor", PAYLOAD, {
        ...TRANSFER_CALL,
        method: "transfer_allow_death",
      })
    ).toBe(null)
  })

  it.each([
    ["another network", { networkId: "bittensor-testnet" }, "network"],
    ["another signer", { payload: { ...PAYLOAD, address: MIRROR } }, "signer"],
    ["another nonce", { payload: { ...PAYLOAD, nonce: toPjsHex(8, 4) } }, "nonce"],
    ["another pallet", { call: { ...TRANSFER_CALL, pallet: "System" } }, "call"],
    ["another call", { call: { ...TRANSFER_CALL, method: "transfer_all" } }, "call"],
    [
      "another destination",
      {
        call: {
          ...TRANSFER_CALL,
          args: { ...TRANSFER_CALL.args, dest: { type: "Id", value: SUB_ADDRESS } },
        },
      },
      "dest",
    ],
    [
      "another amount",
      { call: { ...TRANSFER_CALL, args: { ...TRANSFER_CALL.args, value: 999_999_999n } } },
      "value",
    ],
  ])("rejects %s", (_name, overrides, violation) => {
    const {
      networkId = "bittensor",
      payload = PAYLOAD,
      call = TRANSFER_CALL,
    } = overrides as {
      networkId?: string
      payload?: SignerPayloadJSON
      call?: typeof TRANSFER_CALL
    }
    expect(checkSubstrateLeg(LEG0, LEG1, networkId, payload, call)).toBe(violation)
  })
})

describe("decodeMortalEra", () => {
  it("reads the era's birth and period from the payload", () => {
    expect(decodeMortalEra(ERA, 100)).toEqual({ birth: 100, period: 64 })
    expect(decodeMortalEra(ERA, 130)).toEqual({ birth: 100, period: 64 })
    expect(decodeMortalEra(u8aToHex(mortal({ period: 8, phase: 5 })) as Hex, 21)).toEqual({
      birth: 21,
      period: 8,
    })
  })

  it("has no answer for an immortal era", () => {
    expect(decodeMortalEra("0x00", 100)).toBe(null)
  })
})

describe("admitSubstrateLeg", () => {
  const HASH = `0x${"ee".repeat(32)}` as const
  const TX_INFO0 = {
    type: "swap-bittensor-evm" as const,
    fromTokenId: LEG0.quote.fromTokenId,
    toTokenId: LEG0.quote.toTokenId,
    fromAmount: "1000000000",
    toAmount: LEG0.quote.outputAmount,
    to: EVM_ADDRESS,
  }

  beforeEach(async () => {
    await db.swapPlans.clear()
    await db.transactionsV2.clear()
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(T0)
    mockDecodedCall.mockReturnValue(TRANSFER_CALL)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("runs the plan with the era as evidence", async () => {
    await proposePlan(PROPOSAL, T0 - 1_000)

    const { plan } = await admitSubstrateLeg(
      { id: PLAN_ID, leg: 0 },
      { networkId: "bittensor", payload: PAYLOAD, hash: HASH, txInfo: TX_INFO0 }
    )

    expect(plan.phase).toBe("running")
    expect(plan.signUntil).toBe(T0 + SIGN_WINDOW_MS)
    expect(plan.legs[0]).toEqual({
      ...LEG0,
      state: {
        at: "sent",
        hash: HASH,
        sentAt: T0,
        deadlineAt: T0 + 20 * 60_000,
        evidence: { platform: "polkadot", era: { birth: 100, period: 64 } },
      },
    })
    expect(await db.transactionsV2.get(HASH)).toEqual({
      id: HASH,
      hash: HASH,
      platform: "polkadot",
      networkId: "bittensor",
      account: SUB_ADDRESS,
      nonce: 7,
      payload: PAYLOAD,
      status: "pending",
      confirmed: false,
      label: "Transaction",
      txInfo: { ...TX_INFO0, plan: { id: PLAN_ID, leg: 0 } },
      timestamp: T0,
    })
  })

  it("records nothing when the call does not match the plan", async () => {
    await proposePlan(PROPOSAL, T0 - 1_000)
    mockDecodedCall.mockReturnValue({
      ...TRANSFER_CALL,
      args: { ...TRANSFER_CALL.args, value: 1n },
    })

    await expect(
      admitSubstrateLeg(
        { id: PLAN_ID, leg: 0 },
        { networkId: "bittensor", payload: PAYLOAD, hash: HASH, txInfo: TX_INFO0 }
      )
    ).rejects.toThrow(new PlanBoundViolation("value"))
    expect((await db.swapPlans.get(PLAN_ID))?.phase).toBe("proposed")
    expect(await db.transactionsV2.count()).toBe(0)
  })

  it("refuses leg 0 once the plan runs", async () => {
    await proposePlan(PROPOSAL, T0 - 1_000)
    await applyPlanEvent(PLAN_ID, ADMIT_LEG0, T0)

    await expect(
      admitSubstrateLeg(
        { id: PLAN_ID, leg: 0 },
        { networkId: "bittensor", payload: PAYLOAD, hash: HASH, txInfo: TX_INFO0 }
      )
    ).rejects.toThrow(new PlanNotAdmissible("The leg already has a transaction"))
  })
})
