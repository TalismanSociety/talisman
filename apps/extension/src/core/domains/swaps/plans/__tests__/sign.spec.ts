import { db } from "@core/db"
import type { BuiltLeg } from "@core/domains/swaps/types"
import type { WalletTransaction } from "@core/domains/transactions/types"
import { Err, Ok } from "ts-results"
import { hexToBytes, keccak256, parseTransaction } from "viem"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const {
  isLoggedIn,
  mockWithSecretKey,
  mockGetNextNonce,
  mockReleaseReservedNonce,
  mockSendRawTransaction,
  mockWatchEthereumTransaction,
} = await vi.hoisted(async () => {
  const { BehaviorSubject } = await import("rxjs")
  return {
    isLoggedIn: new BehaviorSubject<"TRUE" | "FALSE" | "UNKNOWN">("TRUE"),
    mockWithSecretKey: vi.fn(),
    mockGetNextNonce: vi.fn(),
    mockReleaseReservedNonce: vi.fn(),
    mockSendRawTransaction: vi.fn(),
    mockWatchEthereumTransaction: vi.fn(),
  }
})

vi.mock("@core/domains/app/store.password", () => ({ passwordStore: { isLoggedIn } }))
vi.mock("@core/domains/keyring/withSecretKey", () => ({
  withSecretKey: (...args: unknown[]) => mockWithSecretKey(...args),
}))
vi.mock("@core/domains/ethereum/nonceManager", () => ({
  getNextNonce: (...args: unknown[]) => mockGetNextNonce(...args),
  releaseReservedNonce: (...args: unknown[]) => mockReleaseReservedNonce(...args),
}))
vi.mock("@core/rpcs/chain-connector-evm", () => ({
  chainConnectorEvm: {
    getPublicClientForEvmNetwork: async () => ({ sendRawTransaction: mockSendRawTransaction }),
  },
}))
vi.mock("@core/domains/transactions/watchEthereumTransaction", () => ({
  watchEthereumTransaction: (...args: unknown[]) => mockWatchEthereumTransaction(...args),
}))
vi.mock("../../env.core", () => ({
  coreSwapEnv: {
    getNetwork: async () => null,
    evmClient: async () => {
      throw new Error("no evm client in this test")
    },
    substrateApi: async () => {
      throw new Error("no substrate api in this test")
    },
  },
}))

import { SIGN_WINDOW_MS } from "../machine"
import { signAndBroadcast } from "../sign"
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
  LEG0_LANDED,
  LEG1_AMOUNT,
  PLAN_ID,
  PROPOSAL,
  RECIPIENT,
  T0,
} from "./fixtures"

const REF = { id: PLAN_ID, leg: 1 }

const EVM_TX = {
  from: EVM_ADDRESS,
  to: GATEWAY,
  data: bridgeOutData(LEG1_AMOUNT),
  value: LEG1_AMOUNT + CCIP_FEE_WITH_BUFFER,
  gas: 650_000n,
  maxFeePerGas: 10n,
  maxPriorityFeePerGas: 1n,
} as const

const BUILT: BuiltLeg = {
  transaction: { platform: "ethereum", transaction: EVM_TX },
  fees: [],
  expectedOutput: LEG1_AMOUNT,
  txInfo: {
    type: "swap-forevermoney",
    fromTokenId: "964:evm-native",
    toTokenId: "8453:evm-erc20:0xf3081494b87e8d5fb7960f066e931d1d0e6e3d67",
    fromAmount: LEG1_AMOUNT.toString(),
    toAmount: LEG1_AMOUNT.toString(),
    to: RECIPIENT,
    destinationStartBlock: "50000000",
  },
}

const planWithLeg1Building = async (nonce?: number) => {
  await proposePlan(PROPOSAL, T0)
  await applyPlanEvent(PLAN_ID, ADMIT_LEG0, T0)
  const result = await applyPlanEvent(PLAN_ID, LEG0_LANDED, T0 + 1_000)
  const plan = result?.plan as SwapPlan
  if (nonce !== undefined)
    await putPlan({ ...plan, legs: [plan.legs[0], { ...plan.legs[1], nonce }] })
}

const sentRaw = () =>
  mockSendRawTransaction.mock.calls[0]?.[0]?.serializedTransaction as `0x${string}`

describe("signAndBroadcast", () => {
  beforeEach(async () => {
    await db.swapPlans.clear()
    await db.transactionsV2.clear()
    isLoggedIn.next("TRUE")
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(T0 + 2_000)
    mockWithSecretKey.mockImplementation(
      async (_address: string, cb: (key: Uint8Array, curve: string) => Promise<unknown>) =>
        Ok(await cb(hexToBytes(EVM_PRIVATE_KEY), "secp256k1"))
    )
    mockGetNextNonce.mockResolvedValue(12)
    mockSendRawTransaction.mockResolvedValue(`0x${"00".repeat(32)}`)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it("pauses on a locked wallet without touching a key or a nonce", async () => {
    await planWithLeg1Building()
    isLoggedIn.next("FALSE")

    expect(await signAndBroadcast(REF, BUILT)).toEqual({ type: "locked" })
    expect(mockWithSecretKey).not.toHaveBeenCalled()
    expect(mockGetNextNonce).not.toHaveBeenCalled()
  })

  it("waits for the login state to settle", async () => {
    await planWithLeg1Building(12)
    isLoggedIn.next("UNKNOWN")

    const outcome = signAndBroadcast(REF, BUILT)
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(mockWithSecretKey).not.toHaveBeenCalled()
    isLoggedIn.next("TRUE")

    expect((await outcome).type).toBe("sent")
  })

  it("signs with the pinned nonce, admits, then broadcasts the same bytes", async () => {
    await planWithLeg1Building(12)

    const outcome = await signAndBroadcast(REF, BUILT)

    const raw = sentRaw()
    expect(outcome).toEqual({ type: "sent", hash: keccak256(raw) })
    expect(parseTransaction(raw)).toMatchObject({
      type: "eip1559",
      chainId: 964,
      nonce: 12,
      to: GATEWAY.toLowerCase(),
      value: LEG1_AMOUNT + CCIP_FEE_WITH_BUFFER,
      gas: 650_000n,
    })
    expect(mockGetNextNonce).not.toHaveBeenCalled()
    expect((await getPlan(PLAN_ID))?.legs[1].state).toMatchObject({
      at: "sent",
      hash: keccak256(raw),
      evidence: { platform: "ethereum", raw },
    })
    expect((await db.transactionsV2.get(keccak256(raw)))?.txInfo).toEqual({
      ...BUILT.txInfo,
      plan: REF,
    })
    expect(mockWatchEthereumTransaction).toHaveBeenCalledWith(
      "964",
      keccak256(raw),
      expect.objectContaining({ from: EVM_ADDRESS, nonce: 12 }),
      { notifications: true, txInfo: { ...BUILT.txInfo, plan: REF } }
    )
  })

  it("reserves a nonce on the first admission, pins it on the leg and hands it to the row", async () => {
    await planWithLeg1Building()
    mockSendRawTransaction.mockRejectedValue(new Error("nonce too high"))
    const rowsAtRelease: Promise<WalletTransaction[]>[] = []
    mockReleaseReservedNonce.mockImplementation(() => {
      rowsAtRelease.push(db.transactionsV2.toArray())
    })

    expect((await signAndBroadcast(REF, BUILT)).type).toBe("sent")

    expect(mockGetNextNonce).toHaveBeenCalledWith(EVM_ADDRESS, "964")
    expect((await getPlan(PLAN_ID))?.legs[1].nonce).toBe(12)
    expect(mockReleaseReservedNonce).toHaveBeenCalledWith(EVM_ADDRESS, "964", 12)
    expect(
      (await Promise.all(rowsAtRelease)).map((rows) =>
        rows.map((row) => [row.status, row.platform !== "solana" && row.nonce])
      )
    ).toEqual([[["pending", 12]]])
  })

  it("releases no reservation for a nonce the leg had pinned", async () => {
    await planWithLeg1Building(12)

    expect((await signAndBroadcast(REF, BUILT)).type).toBe("sent")
    expect(mockReleaseReservedNonce).not.toHaveBeenCalled()
  })

  it("pauses when the key is not available, and gives the reserved nonce back", async () => {
    await planWithLeg1Building()
    mockWithSecretKey.mockResolvedValue(Err("Unauthorised"))

    expect(await signAndBroadcast(REF, BUILT)).toEqual({ type: "locked" })
    expect(mockReleaseReservedNonce).toHaveBeenCalledWith(EVM_ADDRESS, "964", 12)
    expect((await getPlan(PLAN_ID))?.legs[1].state.at).toBe("building")
  })

  it("stops with out-of-bounds before any broadcast when the build breaks the bound", async () => {
    await planWithLeg1Building()
    const built: BuiltLeg = {
      ...BUILT,
      transaction: {
        platform: "ethereum",
        transaction: { ...EVM_TX, value: BigInt(BOUND.maxSpend) + 1n },
      },
    }

    expect(await signAndBroadcast(REF, built)).toEqual({
      type: "out-of-bounds",
      violation: "spend",
    })
    expect(mockSendRawTransaction).not.toHaveBeenCalled()
    expect(mockReleaseReservedNonce).toHaveBeenCalledWith(EVM_ADDRESS, "964", 12)
    expect((await getPlan(PLAN_ID))?.legs[1].state.at).toBe("building")
    expect(await db.transactionsV2.count()).toBe(0)
  })

  it("leaves the leg sent when the node already knows the bytes", async () => {
    await planWithLeg1Building(12)
    mockSendRawTransaction.mockRejectedValue(new Error("already known"))

    expect((await signAndBroadcast(REF, BUILT)).type).toBe("sent")
    expect((await getPlan(PLAN_ID))?.legs[1].state.at).toBe("sent")
  })

  it("leaves the leg sent when the broadcast fails for another reason", async () => {
    await planWithLeg1Building(12)
    mockSendRawTransaction.mockRejectedValue(new Error("connection reset"))

    expect((await signAndBroadcast(REF, BUILT)).type).toBe("sent")
    expect((await getPlan(PLAN_ID))?.legs[1].state.at).toBe("sent")
    expect(mockWatchEthereumTransaction).toHaveBeenCalledTimes(1)
  })

  it("never reaches the key once the sign window closed", async () => {
    await planWithLeg1Building(12)
    vi.setSystemTime(T0 + SIGN_WINDOW_MS + 1)

    expect(await signAndBroadcast(REF, BUILT)).toEqual({ type: "stale" })
    expect(mockWithSecretKey).not.toHaveBeenCalled()
    expect(mockSendRawTransaction).not.toHaveBeenCalled()
    expect((await getPlan(PLAN_ID))?.legs[1].state.at).toBe("building")
  })

  it("never reaches the key when the sign window closed while it took a nonce", async () => {
    await planWithLeg1Building()
    mockGetNextNonce.mockImplementation(async () => {
      vi.setSystemTime(T0 + SIGN_WINDOW_MS + 1)
      return 12
    })

    expect(await signAndBroadcast(REF, BUILT)).toEqual({ type: "stale" })
    expect(mockWithSecretKey).not.toHaveBeenCalled()
    expect(mockReleaseReservedNonce).toHaveBeenCalledWith(EVM_ADDRESS, "964", 12)
  })

  it("is stale when the leg stopped waiting for a transaction", async () => {
    await planWithLeg1Building(12)
    await applyPlanEvent(PLAN_ID, { type: "cancelled" }, T0 + 2_000)

    expect(await signAndBroadcast(REF, BUILT)).toEqual({ type: "stale" })
    expect(mockSendRawTransaction).not.toHaveBeenCalled()
  })
})
