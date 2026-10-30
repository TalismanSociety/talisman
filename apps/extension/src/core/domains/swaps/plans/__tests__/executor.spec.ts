import { db } from "@core/db"
import type { SwapEnv } from "@core/domains/swaps/env"
import { SwapProviderUnavailableError } from "@core/domains/swaps/errors"
import type {
  BackgroundSwapModule,
  BuiltLeg,
  LegObservation,
  SentLeg,
} from "@core/domains/swaps/types"
import type { WalletTransactionDot } from "@core/domains/transactions/types"
import { type Hex, keccak256, type TransactionRequest } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../env.core", () => ({
  coreSwapEnv: {
    getNetwork: async (id: string) => (id === "964" ? { id, platform: "ethereum" } : null),
    evmClient: async () => ({ getBalance: async () => 0n, getTransactionCount: async () => 0 }),
    substrateApi: async () => {
      throw new Error("no substrate api in this test")
    },
  },
}))
vi.mock("@core/rpcs/chain-connector-evm", () => ({ chainConnectorEvm: {} }))
vi.mock("@core/rpcs/chain-connector-dot", () => ({ chainConnectorDot: {} }))
vi.mock("@core/rpcs/chain-connector-sol", () => ({ chainConnectorSol: {} }))

import { admitEvmLeg, admitEvmReplacement } from "../admit"
import { createSwapPlanExecutor, type ExecutorDeps } from "../executor"
import { isTerminalPhase, SIGN_WINDOW_MS } from "../machine"
import type { SignOutcome } from "../sign"
import { applyPlanEvent, getPlan, proposePlan, putPlan } from "../store"
import type { SwapPlan, SwapPlanRef } from "../types"
import {
  ADMIT_LEG0,
  ALPHA_TOKEN,
  bridgeOutData,
  CCIP_FEE_WITH_BUFFER,
  EVM_ADDRESS,
  EVM_PRIVATE_KEY,
  GATEWAY,
  LEG0_HASH,
  LEG0_OUTPUT,
  LEG1,
  LEG1_AMOUNT,
  PLAN_ID,
  PROPOSAL,
  RECIPIENT,
  SUB_ADDRESS,
  T0,
} from "./fixtures"

const account = privateKeyToAccount(EVM_PRIVATE_KEY)

const PENDING: LegObservation = { status: "pending" }
const LEG0_LANDED: LegObservation = { status: "landed", hash: LEG0_HASH, amount: LEG0_OUTPUT }
/** leg 1's own transaction executed */
const LEG1_LANDED = (sent: SentLeg): LegObservation => ({
  status: "landed",
  hash: sent.hash,
  amount: LEG1_AMOUNT,
})
const LEG1_REVERTED = (sent: SentLeg): LegObservation => ({
  status: "failed",
  reason: "reverted",
  hash: sent.hash,
})

/** an Error is a node that fails to answer */
type ChainAnswer = LegObservation | Error
type Answer = ChainAnswer | ((sent: SentLeg) => ChainAnswer | Promise<ChainAnswer>)
type Chain = {
  leg0: Answer
  leg1: Answer
  broadcasts: Hex[]
}
let chain: Chain
let clock: number
let signedRaws: Hex[]

const EVM_TX = {
  from: EVM_ADDRESS,
  to: GATEWAY,
  data: bridgeOutData(LEG1_AMOUNT),
  value: LEG1_AMOUNT + CCIP_FEE_WITH_BUFFER,
  gas: 650_000n,
  maxFeePerGas: 10n,
  maxPriorityFeePerGas: 1n,
} as const

const UNSIGNED: TransactionRequest<string> = {
  from: EVM_ADDRESS,
  to: GATEWAY,
  data: EVM_TX.data,
  value: EVM_TX.value.toString(),
  gas: "650000",
  maxFeePerGas: "10",
  maxPriorityFeePerGas: "1",
  nonce: 12,
  type: "eip1559",
}

const BUILT: BuiltLeg = {
  transaction: { platform: "ethereum", transaction: EVM_TX },
  fees: [],
  expectedOutput: LEG1_AMOUNT,
  txInfo: {
    type: "swap-forevermoney",
    fromTokenId: LEG1.quote.fromTokenId,
    toTokenId: LEG1.quote.toTokenId,
    fromAmount: LEG1_AMOUNT.toString(),
    toAmount: LEG1_AMOUNT.toString(),
    to: RECIPIENT,
    destinationStartBlock: "50000000",
  },
}

const LEG0_ROW: WalletTransactionDot = {
  id: LEG0_HASH,
  hash: LEG0_HASH,
  platform: "polkadot",
  networkId: "bittensor",
  account: SUB_ADDRESS,
  nonce: 7,
  payload: {} as WalletTransactionDot["payload"],
  status: "pending",
  confirmed: false,
  timestamp: T0,
  txInfo: {
    type: "swap-bittensor-evm",
    fromTokenId: "bittensor:substrate-native",
    toTokenId: "964:evm-native",
    fromAmount: "1000000000",
    toAmount: LEG0_OUTPUT.toString(),
    to: EVM_ADDRESS,
    plan: { id: PLAN_ID, leg: 0 },
  },
}

const fakeModule = (
  protocol: BackgroundSwapModule["protocol"],
  observe: (sent: SentLeg) => ChainAnswer | Promise<ChainAnswer>,
  buildLeg: BackgroundSwapModule["buildLeg"] = async () => BUILT
): BackgroundSwapModule => ({
  protocol,
  decentralisationScore: 0,
  getFromAssets: async () => [],
  getToAssets: async () => [],
  getQuote: async () => null,
  buildLeg,
  legDeadlineMs: 30 * 60_000,
  boundLeg: async () => null,
  observeLeg: async ({ sent }) => {
    const answer = await observe(sent)
    if (answer instanceof Error) throw answer
    return answer
  },
})

const answer = (given: Answer, sent: SentLeg) => (typeof given === "function" ? given(sent) : given)

/** leg 1 only lands once its bytes reached the chain */
const observeLeg1 = (sent: SentLeg) =>
  chain.broadcasts.includes(sent.hash) ? answer(chain.leg1, sent) : PENDING

class SimulatedCrash extends Error {}

type ExecutorOptions = {
  crashAt?: number | null
  unlocked?: boolean | (() => Promise<boolean>)
  buildLeg?: BackgroundSwapModule["buildLeg"]
  delivery?: () => Promise<void>
  sign?: ExecutorDeps["sign"]
}

const makeExecutor = ({
  crashAt = null,
  unlocked = true,
  buildLeg,
  delivery = async () => {},
  sign: signOverride,
}: ExecutorOptions = {}) => {
  let seen = 0
  const notified: string[] = []
  const alarms: boolean[] = []
  const tracked: Hex[] = []
  const checkpoint = async (label: string) => {
    if (crashAt !== null && seen++ === crashAt) throw new SimulatedCrash(label)
    if (crashAt === null) seen++
  }
  const modules: Record<string, BackgroundSwapModule> = {
    "bittensor-evm": fakeModule("bittensor-evm", (sent) => answer(chain.leg0, sent)),
    forevermoney: fakeModule("forevermoney", observeLeg1, buildLeg),
  }

  const sign = async (ref: SwapPlanRef, built: BuiltLeg): Promise<SignOutcome> => {
    const plan = await getPlan(ref.id)
    const nonce = plan?.legs[ref.leg]?.nonce ?? 12
    const raw = await account.signTransaction({ ...EVM_TX, type: "eip1559", chainId: 964, nonce })
    signedRaws.push(raw)
    await admitEvmLeg(ref, { raw, networkId: "964", unsigned: UNSIGNED, txInfo: built.txInfo })
    await checkpoint(`admitted:${ref.leg}`)
    chain.broadcasts.push(keccak256(raw))
    return { type: "sent", hash: keccak256(raw) }
  }

  const deps: ExecutorDeps = {
    env: {
      evmClient: async () => ({
        getBalance: async () => 2n * 10n ** 18n,
        readContract: async () => 7n,
        getTransactionCount: async () => 0,
      }),
    } as unknown as SwapEnv,
    getModule: (protocol) => modules[protocol],
    getRuntime: (protocol) => modules[protocol],
    sign: signOverride ?? sign,
    isUnlocked: typeof unlocked === "function" ? unlocked : async () => unlocked,
    notify: async (kind) => {
      notified.push(kind)
    },
    setAlarm: async (needed) => {
      alarms.push(needed)
    },
    broadcast: async (_networkId, raw) => {
      chain.broadcasts.push(keccak256(raw))
    },
    trackDelivery: (hash) => {
      tracked.push(hash)
      return delivery()
    },
    now: () => clock,
    checkpoint,
  }
  return {
    executor: createSwapPlanExecutor(deps),
    notified,
    alarms,
    tracked,
    checkpoints: () => seen,
  }
}

const seedRunningPlan = async () => {
  await proposePlan(PROPOSAL, T0)
  await applyPlanEvent(PLAN_ID, ADMIT_LEG0, T0)
  await db.transactionsV2.put(LEG0_ROW)
}

const settlesWithin = (promise: Promise<unknown>, ms: number) =>
  Promise.race([
    promise.then(() => "settled"),
    new Promise((resolve) => setTimeout(resolve, ms, "still running")),
  ])

const reset = async () => {
  await db.swapPlans.clear()
  await db.transactionsV2.clear()
  chain = { leg0: PENDING, leg1: PENDING, broadcasts: [] }
  clock = T0 + 10_000
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(clock)
  signedRaws = []
}

const happyPath = async (executor: ReturnType<typeof makeExecutor>["executor"]) => {
  await executor.drive(PLAN_ID)
  chain.leg0 = LEG0_LANDED
  await executor.drive(PLAN_ID)
  chain.leg1 = LEG1_LANDED
  await executor.drive(PLAN_ID)
}

const converge = async (executor: ReturnType<typeof makeExecutor>["executor"]) => {
  for (let tick = 0; tick < 8; tick++) {
    const plan = await getPlan(PLAN_ID)
    if (plan && isTerminalPhase(plan.phase)) return
    chain.leg0 = LEG0_LANDED
    chain.leg1 = LEG1_LANDED
    await executor.resumeAll()
  }
}

const leg1Rows = async () =>
  (await db.transactionsV2.toArray())
    .filter((row) => row.txInfo?.plan?.leg === 1)
    .map((row) => ({ nonce: row.platform === "solana" ? null : row.nonce, status: row.status }))

const landedHash = (plan: SwapPlan | undefined) => {
  const state = plan?.legs[1].state
  return state?.at === "landed" ? state.hash : null
}

describe("swap plan executor", () => {
  beforeEach(reset)
  afterEach(() => {
    vi.useRealTimers()
  })

  it("runs a two-leg plan to completion and keeps the alarm only while a leg is live", async () => {
    await seedRunningPlan()
    const { executor, notified, alarms } = makeExecutor()

    await happyPath(executor)

    const plan = await getPlan(PLAN_ID)
    expect(plan?.phase).toBe("completed")
    expect(plan?.legs.map((leg) => leg.state.at)).toEqual(["landed", "landed"])
    expect(plan?.legs[1].nonce).toBe(12)
    expect((await leg1Rows()).map((row) => [row.nonce, row.status])).toEqual([[12, "success"]])
    expect(notified).toEqual(["completed"])
    expect(alarms).toEqual([true, true, false])
  })

  it("converges after a crash between every pair of effects, with one transaction per leg", async () => {
    await seedRunningPlan()
    const dry = makeExecutor()
    await happyPath(dry.executor)
    const total = dry.checkpoints()
    expect(total).toBeGreaterThanOrEqual(5)

    for (let crashAt = 0; crashAt < total; crashAt++) {
      await reset()
      await seedRunningPlan()

      const first = makeExecutor({ crashAt })
      await expect(happyPath(first.executor)).rejects.toBeInstanceOf(SimulatedCrash)

      const second = makeExecutor()
      await converge(second.executor)

      const plan = await getPlan(PLAN_ID)
      expect(plan?.phase, `crash at checkpoint ${crashAt}`).toBe("completed")
      expect(plan?.legs[1].nonce, `crash at checkpoint ${crashAt}`).toBe(12)
      expect(
        (await leg1Rows()).map((row) => row.nonce),
        `crash at checkpoint ${crashAt}`
      ).toEqual([12])
      expect(new Set(chain.broadcasts).size, `crash at checkpoint ${crashAt}`).toBe(1)
      expect(chain.broadcasts).toContain(landedHash(plan))
      expect(new Set(signedRaws).size, `crash at checkpoint ${crashAt}`).toBe(1)
      const completions = [...first.notified, ...second.notified].filter(
        (kind) => kind === "completed"
      )
      expect(completions.length, `crash at checkpoint ${crashAt}`).toBeLessThanOrEqual(1)
    }
  })

  it("pauses on a locked wallet and finishes after the unlock", async () => {
    await seedRunningPlan()
    chain.leg0 = LEG0_LANDED
    const locked = makeExecutor({ unlocked: false })

    await locked.executor.drive(PLAN_ID)

    const paused = await getPlan(PLAN_ID)
    expect(paused?.phase).toBe("paused")
    expect(paused?.legs[1].state).toEqual({ at: "awaiting-user", why: "unlock", since: clock })
    expect(locked.notified).toEqual(["needs-you"])
    expect(locked.alarms.at(-1)).toBe(false)

    const unlocked = makeExecutor()
    await unlocked.executor.onUnlock()
    expect((await getPlan(PLAN_ID))?.legs[1].state.at).toBe("sent")

    chain.leg1 = LEG1_LANDED
    await unlocked.executor.drive(PLAN_ID)
    expect((await getPlan(PLAN_ID))?.phase).toBe("completed")
    expect(unlocked.notified).toEqual(["completed"])
  })

  it("resumes a plan whose wallet unlocks while its pause is being written", async () => {
    await seedRunningPlan()
    chain.leg0 = LEG0_LANDED
    let walletUnlocked = false
    const racing = makeExecutor({
      unlocked: async () => {
        if (walletUnlocked) return true
        walletUnlocked = true
        await racing.executor.onUnlock()
        return false
      },
    })

    await racing.executor.drive(PLAN_ID)

    const plan = await getPlan(PLAN_ID)
    expect(plan?.phase).toBe("running")
    expect(plan?.legs[1].state.at).toBe("sent")
    expect(racing.notified).toEqual([])
  })

  it("stops a leg left building past the sign window without signing it", async () => {
    await seedRunningPlan()
    await applyPlanEvent(
      PLAN_ID,
      { type: "observed", leg: 0, candidates: 1, observation: LEG0_LANDED },
      T0 + 10_000
    )
    clock = T0 + SIGN_WINDOW_MS + 1
    const { executor, notified } = makeExecutor()

    await executor.resumeAll()

    const plan = await getPlan(PLAN_ID)
    expect(plan?.phase).toBe("stopped")
    expect(plan?.legs[1].state).toEqual({ at: "failed", failure: "expired", failedAt: clock })
    expect(signedRaws).toEqual([])
    expect(notified).toEqual(["stopped"])
  })

  it("settles the rows a restart left unknown and tracks each landed leg's delivery", async () => {
    await seedRunningPlan()
    await db.transactionsV2.update(LEG0_HASH, { status: "unknown" })
    const { executor, tracked } = makeExecutor()
    chain.leg0 = LEG0_LANDED
    await executor.drive(PLAN_ID)
    const [leg1Row] = (await db.transactionsV2.toArray()).filter(
      (row) => row.txInfo?.plan?.leg === 1
    )
    await db.transactionsV2.update(leg1Row.id, { status: "unknown" })

    chain.leg1 = LEG1_LANDED
    await executor.resumeAll()

    expect((await getPlan(PLAN_ID))?.phase).toBe("completed")
    const rows = await db.transactionsV2.bulkGet([LEG0_HASH, leg1Row.id])
    expect(rows.map((row) => [row?.status, row?.confirmed])).toEqual([
      ["success", true],
      ["success", true],
    ])
    expect(tracked).toEqual([LEG0_HASH, leg1Row.id])
  })

  it("completes the plan without waiting on a landed leg's delivery tracking", async () => {
    await seedRunningPlan()
    const hanging = makeExecutor({ delivery: () => new Promise(() => {}) })
    expect(await settlesWithin(happyPath(hanging.executor), 1_000)).toBe("settled")
    expect((await getPlan(PLAN_ID))?.phase).toBe("completed")

    await reset()
    await seedRunningPlan()
    const failing = makeExecutor({ delivery: () => Promise.reject(new Error("rpc down")) })
    await happyPath(failing.executor)
    expect((await getPlan(PLAN_ID))?.phase).toBe("completed")
  })

  it("drives each live plan on its own, so a plan whose node hangs holds back no other", async () => {
    await seedRunningPlan()
    const seeded = await getPlan(PLAN_ID)
    const sent = seeded?.legs[0].state
    if (!seeded || sent?.at !== "sent") throw new Error("expected leg 0 sent")
    const other: SwapPlan = {
      ...seeded,
      id: "plan-2" as SwapPlan["id"],
      legs: [
        { ...seeded.legs[0], state: { ...sent, hash: `0x${"22".repeat(32)}` } },
        seeded.legs[1],
      ],
    }
    chain.leg0 = (observed) =>
      observed.hash === LEG0_HASH
        ? new Promise(() => {})
        : Promise.resolve({ status: "failed", reason: "reverted", hash: observed.hash })

    for (const wake of ["tick", "resumeAll"] as const) {
      await putPlan(other)
      void makeExecutor().executor[wake]()
      await vi.waitFor(async () =>
        expect((await getPlan(other.id))?.legs[0].state).toMatchObject({ failure: "reverted" })
      )
    }
  })

  it("marks the row of a reverted leg as an error", async () => {
    await seedRunningPlan()
    chain.leg0 = LEG0_LANDED
    const { executor, tracked } = makeExecutor()
    await executor.drive(PLAN_ID)

    chain.leg1 = LEG1_REVERTED
    await executor.drive(PLAN_ID)

    const [leg1Row] = (await db.transactionsV2.toArray()).filter(
      (row) => row.txInfo?.plan?.leg === 1
    )
    expect(leg1Row.status).toBe("error")
    expect(tracked).toEqual([LEG0_HASH])
  })

  it("stops and notifies once when a later leg reverts", async () => {
    await seedRunningPlan()
    chain.leg0 = LEG0_LANDED
    const { executor, notified, alarms } = makeExecutor()
    await executor.drive(PLAN_ID)

    chain.leg1 = LEG1_REVERTED
    await executor.drive(PLAN_ID)
    await executor.drive(PLAN_ID)

    const plan = await getPlan(PLAN_ID)
    expect(plan?.phase).toBe("stopped")
    expect(plan?.legs[1].state).toMatchObject({ at: "failed", failure: "reverted" })
    expect(notified).toEqual(["stopped"])
    expect(alarms.at(-1)).toBe(false)
  })

  it("marks the row of a dropped leg as an error", async () => {
    await seedRunningPlan()
    chain.leg0 = { status: "dropped" }
    const { executor, tracked } = makeExecutor()

    await executor.drive(PLAN_ID)

    expect((await getPlan(PLAN_ID))?.legs[0].state).toMatchObject({ failure: "dropped" })
    expect((await db.transactionsV2.get(LEG0_HASH))?.status).toBe("error")
    expect(tracked).toEqual([])
  })

  it("leaves the row alone when the plan does not take a later leg for dropped", async () => {
    await seedRunningPlan()
    chain.leg0 = LEG0_LANDED
    const { executor } = makeExecutor()
    await executor.drive(PLAN_ID)
    chain.leg1 = { status: "dropped" }

    await executor.drive(PLAN_ID)

    const sent = (await getPlan(PLAN_ID))?.legs[1].state
    if (sent?.at !== "sent") throw new Error("expected leg 1 sent")
    expect((await db.transactionsV2.get(sent.hash))?.status).toBe("pending")
  })

  it("leaves the row of an indeterminate leg unknown, never an error", async () => {
    await seedRunningPlan()
    chain.leg0 = { status: "failed", reason: "indeterminate" }
    const { executor } = makeExecutor()

    await executor.drive(PLAN_ID)

    expect((await getPlan(PLAN_ID))?.legs[0].state).toMatchObject({ failure: "indeterminate" })
    expect((await db.transactionsV2.get(LEG0_HASH))?.status).toBe("unknown")
  })

  it("calls a sent leg indeterminate past its deadline while its observation keeps failing", async () => {
    await seedRunningPlan()
    chain.leg0 = LEG0_LANDED
    const { executor, notified } = makeExecutor()
    await executor.drive(PLAN_ID)
    const sent = (await getPlan(PLAN_ID))?.legs[1].state
    if (sent?.at !== "sent") throw new Error("expected leg 1 sent")
    chain.leg1 = new Error("503 Service Unavailable")

    await executor.drive(PLAN_ID)
    expect((await getPlan(PLAN_ID))?.legs[1].state.at).toBe("sent")
    expect(chain.broadcasts).toEqual([sent.hash])

    clock = sent.deadlineAt
    await executor.drive(PLAN_ID)

    expect((await getPlan(PLAN_ID))?.legs[1].state).toEqual({
      at: "failed",
      failure: "indeterminate",
      hash: sent.hash,
      failedAt: clock,
    })
    expect((await db.transactionsV2.get(sent.hash))?.status).toBe("unknown")
    expect(notified).toEqual(["stopped"])
  })

  it("calls a sent leg indeterminate past its deadline", async () => {
    await seedRunningPlan()
    chain.leg0 = LEG0_LANDED
    const { executor, notified } = makeExecutor()
    await executor.drive(PLAN_ID)
    const sent = (await getPlan(PLAN_ID))?.legs[1].state
    if (sent?.at !== "sent") throw new Error("expected leg 1 sent")

    clock = sent.deadlineAt
    await executor.drive(PLAN_ID)

    expect((await getPlan(PLAN_ID))?.legs[1].state).toEqual({
      at: "failed",
      failure: "indeterminate",
      hash: sent.hash,
      failedAt: clock,
    })
    expect((await db.transactionsV2.get(sent.hash))?.status).toBe("unknown")
    expect(notified).toEqual(["stopped"])
  })

  it("keeps a pending leg's scan for its next observation, across a restart", async () => {
    await seedRunningPlan()
    const scannedBefore: (number[] | undefined)[] = []
    chain.leg0 = async ({ evidence }) => {
      if (evidence.platform === "polkadot") scannedBefore.push(evidence.scanned)
      return { status: "pending", scanned: scannedBefore.length === 1 ? [163, 162] : [161] }
    }

    await makeExecutor().executor.drive(PLAN_ID)
    await makeExecutor().executor.drive(PLAN_ID)

    expect(scannedBefore).toEqual([undefined, [163, 162]])
    expect((await getPlan(PLAN_ID))?.legs[0].state).toMatchObject({
      at: "sent",
      evidence: { scanned: [163, 162, 161] },
    })
  })

  it("resends the signed bytes of a pending leg", async () => {
    await seedRunningPlan()
    chain.leg0 = LEG0_LANDED
    const { executor } = makeExecutor()
    await executor.drive(PLAN_ID)
    const [hash] = chain.broadcasts
    chain.broadcasts = []

    await executor.drive(PLAN_ID)

    expect(chain.broadcasts).toEqual([hash])
  })

  it("stops with no transaction when the provider is unavailable", async () => {
    await seedRunningPlan()
    chain.leg0 = LEG0_LANDED
    const { executor, notified } = makeExecutor({
      buildLeg: async () => {
        throw new SwapProviderUnavailableError("ForeverMoney bridge is paused")
      },
    })

    await executor.drive(PLAN_ID)

    const plan = await getPlan(PLAN_ID)
    expect(plan?.phase).toBe("stopped")
    expect(plan?.legs[1].state).toEqual({
      at: "failed",
      failure: "provider-unavailable",
      failedAt: clock,
    })
    expect(await leg1Rows()).toEqual([])
    expect(notified).toEqual(["stopped"])
  })

  it("hands a leg whose rate fell under its floor to the user, unsigned", async () => {
    await seedRunningPlan()
    chain.leg0 = LEG0_LANDED
    const { executor, notified } = makeExecutor({
      buildLeg: async () => ({ ...BUILT, acceptedOutput: BUILT.expectedOutput + 1n }),
    })

    await executor.drive(PLAN_ID)

    const plan = await getPlan(PLAN_ID)
    expect(plan?.phase).toBe("paused")
    expect(plan?.pausedFor).toBe("signature")
    expect(plan?.legs[1].state).toEqual({ at: "awaiting-user", why: "signature", since: clock })
    expect(await leg1Rows()).toEqual([])
    expect(notified).toEqual(["needs-you"])
  })

  it("hands the leg to the user when this browser session did not propose the plan", async () => {
    await seedRunningPlan()
    chain.leg0 = LEG0_LANDED
    const { executor, notified } = makeExecutor({ sign: async () => ({ type: "unsealed" }) })

    await executor.drive(PLAN_ID)

    const plan = await getPlan(PLAN_ID)
    expect(plan?.legs[1].state).toEqual({ at: "awaiting-user", why: "signature", since: clock })
    expect(await leg1Rows()).toEqual([])
    expect(notified).toEqual(["needs-you"])
  })

  it("builds an ERC20 leg on the signer's token balance, not the native one", async () => {
    await seedRunningPlan()
    chain.leg0 = LEG0_LANDED
    const inputs: bigint[] = []
    const { executor } = makeExecutor({
      buildLeg: async ({ input }) => {
        inputs.push(input)
        return BUILT
      },
    })
    await executor.drive(PLAN_ID)
    const plan = await getPlan(PLAN_ID)
    if (!plan) throw new Error("expected a plan")
    const leg1 = plan.legs[1]
    await putPlan({
      ...plan,
      legs: [
        plan.legs[0],
        {
          ...leg1,
          quote: { ...leg1.quote, fromTokenId: `964:evm-erc20:${ALPHA_TOKEN.toLowerCase()}` },
          state: { at: "building", attempt: 1, nextAttemptAt: clock },
        },
      ],
    })

    await executor.drive(PLAN_ID)
    expect(inputs).toEqual([LEG0_OUTPUT, 7n])
  })

  it("backs off after a transient build failure and tries again when due", async () => {
    await seedRunningPlan()
    chain.leg0 = LEG0_LANDED
    let failures = 1
    const { executor } = makeExecutor({
      buildLeg: async () => {
        if (failures-- > 0) throw new Error("rpc timeout")
        return BUILT
      },
    })

    await executor.drive(PLAN_ID)
    expect((await getPlan(PLAN_ID))?.legs[1].state).toEqual({
      at: "building",
      attempt: 2,
      nextAttemptAt: clock + 30_000,
    })

    await executor.drive(PLAN_ID)
    expect((await getPlan(PLAN_ID))?.legs[1].state.at).toBe("building")

    clock += 30_000
    await executor.drive(PLAN_ID)
    expect((await getPlan(PLAN_ID))?.legs[1].state.at).toBe("sent")
  })
})

describe("a swap plan leg the user speeds up or cancels", () => {
  const REF1: SwapPlanRef = { id: PLAN_ID, leg: 1 }
  const FASTER = { maxFeePerGas: 20n, maxPriorityFeePerGas: 2n }

  beforeEach(reset)
  afterEach(() => {
    vi.useRealTimers()
  })

  /** signed as the replace drawer builds it: a speed-up keeps the call, a cancel sends nothing to the signer */
  const signReplacement = (kind: "speed-up" | "cancel") =>
    account.signTransaction(
      kind === "speed-up"
        ? { ...EVM_TX, ...FASTER, type: "eip1559", chainId: 964, nonce: 12 }
        : {
            ...FASTER,
            type: "eip1559",
            chainId: 964,
            nonce: 12,
            to: EVM_ADDRESS,
            value: 0n,
            gas: 21_000n,
          }
    )

  const replaceLeg1 = async (kind: "speed-up" | "cancel", { broadcast = true } = {}) => {
    const raw = await signReplacement(kind)
    await admitEvmReplacement(REF1, {
      raw,
      networkId: "964",
      unsigned: UNSIGNED,
      txInfo: BUILT.txInfo,
    })
    if (broadcast) chain.broadcasts.push(keccak256(raw))
    return keccak256(raw)
  }

  /** the transaction executes once its bytes reached the chain */
  const executes =
    (hash: Hex, observation: LegObservation): Answer =>
    () =>
      chain.broadcasts.includes(hash) ? observation : PENDING

  const leg1Sent = async () => {
    await seedRunningPlan()
    chain.leg0 = LEG0_LANDED
    const made = makeExecutor()
    await made.executor.drive(PLAN_ID)
    const state = (await getPlan(PLAN_ID))?.legs[1].state
    if (state?.at !== "sent") throw new Error("expected leg 1 sent")
    return { ...made, original: state.hash }
  }

  const statusOf = async (hash: Hex) => (await db.transactionsV2.get(hash))?.status

  it("completes with the speed-up that executed, and settles the leg's own row as replaced", async () => {
    const { executor, original, tracked, notified } = await leg1Sent()
    const speedUp = await replaceLeg1("speed-up")
    chain.leg1 = executes(speedUp, { status: "landed", hash: speedUp, amount: LEG1_AMOUNT })

    await executor.drive(PLAN_ID)

    const plan = await getPlan(PLAN_ID)
    expect(plan?.phase).toBe("completed")
    expect(plan?.legs[1].state).toMatchObject({ at: "landed", hash: speedUp })
    expect([await statusOf(speedUp), await statusOf(original)]).toEqual(["success", "replaced"])
    expect(tracked).toEqual([LEG0_HASH, speedUp])
    expect(notified).toEqual(["completed"])
  })

  it("completes with the leg's own transaction when it executed after a speed-up was sent", async () => {
    const { executor, original, tracked } = await leg1Sent()
    const speedUp = await replaceLeg1("speed-up")
    chain.leg1 = LEG1_LANDED

    await executor.drive(PLAN_ID)

    const plan = await getPlan(PLAN_ID)
    expect(plan?.phase).toBe("completed")
    expect(plan?.legs[1].state).toMatchObject({ at: "landed", hash: original })
    expect([await statusOf(original), await statusOf(speedUp)]).toEqual(["success", "replaced"])
    expect(tracked).toEqual([LEG0_HASH, original])
  })

  it("settles a speed-up its watcher saw land in a block that was reorged out as replaced", async () => {
    const { executor, original } = await leg1Sent()
    const speedUp = await replaceLeg1("speed-up")
    await db.transactionsV2.update(speedUp, { status: "success", confirmed: false })
    chain.leg1 = LEG1_LANDED

    await executor.drive(PLAN_ID)

    expect([await statusOf(original), await statusOf(speedUp)]).toEqual(["success", "replaced"])
  })

  it("stops when the user's cancel executed, the cancel's row a success", async () => {
    const { executor, original, tracked, notified } = await leg1Sent()
    const cancel = await replaceLeg1("cancel")
    chain.leg1 = executes(cancel, { status: "failed", reason: "cancelled", hash: cancel })

    await executor.drive(PLAN_ID)

    const plan = await getPlan(PLAN_ID)
    expect(plan?.phase).toBe("stopped")
    expect(plan?.legs[1].state).toEqual({
      at: "failed",
      failure: "cancelled",
      hash: cancel,
      sentHash: original,
      failedAt: clock,
    })
    expect([await statusOf(cancel), await statusOf(original)]).toEqual(["success", "replaced"])
    expect(tracked).toEqual([LEG0_HASH])
    expect(notified).toEqual(["stopped"])
  })

  it("carries on when the leg's own transaction beat the user's cancel", async () => {
    const { executor, original } = await leg1Sent()
    const cancel = await replaceLeg1("cancel")
    chain.leg1 = LEG1_LANDED

    await executor.drive(PLAN_ID)

    expect((await getPlan(PLAN_ID))?.phase).toBe("completed")
    expect([await statusOf(original), await statusOf(cancel)]).toEqual(["success", "replaced"])
  })

  it("resends each of the leg's transactions while it is pending, the latest first", async () => {
    const { executor, original } = await leg1Sent()
    const speedUp = await replaceLeg1("speed-up", { broadcast: false })
    chain.broadcasts = []

    await executor.drive(PLAN_ID)

    expect(chain.broadcasts).toEqual([speedUp, original])
  })

  it("never sends a replacement it refused", async () => {
    const { executor, original } = await leg1Sent()
    const raw = await account.signTransaction({
      ...EVM_TX,
      ...FASTER,
      type: "eip1559",
      chainId: 964,
      nonce: 12,
      to: RECIPIENT,
    })
    await expect(
      admitEvmReplacement(REF1, { raw, networkId: "964", unsigned: UNSIGNED, txInfo: BUILT.txInfo })
    ).rejects.toThrow("call")
    chain.broadcasts = []

    await executor.drive(PLAN_ID)

    expect(chain.broadcasts).toEqual([original])
    expect(await db.transactionsV2.get(keccak256(raw))).toBeUndefined()
  })

  it("converges after a restart between a speed-up's admission and its broadcast", async () => {
    const { original } = await leg1Sent()
    const speedUp = await replaceLeg1("speed-up", { broadcast: false })
    chain.leg1 = executes(speedUp, { status: "landed", hash: speedUp, amount: LEG1_AMOUNT })

    const restarted = makeExecutor()
    await restarted.executor.resumeAll()
    expect(await replaceLeg1("speed-up")).toBe(speedUp)
    await restarted.executor.resumeAll()

    const plan = await getPlan(PLAN_ID)
    expect(plan?.phase).toBe("completed")
    expect(plan?.legs[1].state).toMatchObject({ at: "landed", hash: speedUp })
    expect((await leg1Rows()).map((row) => row.status).sort()).toEqual(["replaced", "success"])
    expect([await statusOf(speedUp), await statusOf(original)]).toEqual(["success", "replaced"])
  })
})
