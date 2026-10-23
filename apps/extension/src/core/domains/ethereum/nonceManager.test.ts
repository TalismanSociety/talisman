import type { PlanLeg, SwapPlan, SwapPlanId } from "@core/domains/swaps/plans/types"
import type { WalletTransactionEth } from "@core/domains/transactions/types"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock chainConnectorEvm before importing the module under test
const mockGetTransactionCount = vi.fn<() => Promise<number>>()
const mockGetTransaction = vi.fn()

vi.mock("../../rpcs/chain-connector-evm", () => ({
  chainConnectorEvm: {
    getPublicClientForEvmNetwork: vi.fn().mockResolvedValue({
      getTransactionCount: (_args: { address: string }) => mockGetTransactionCount(),
      getTransaction: (args: { hash: string }) => mockGetTransaction(args),
    }),
  },
}))

// Use real Dexie with fake-indexeddb (auto-imported in setup)
import { db } from "../../db"
import { PENDING_TX_AGE_THRESHOLD_MS } from "../transactions/cleanupDroppedTransactions"
import { _resetNonceState, getNextNonce, releaseReservedNonce } from "./nonceManager"

const ADDRESS = "0x1111111111111111111111111111111111111111" as const
const NETWORK_ID = "1"

const makeTx = (
  nonce: number,
  status: "pending" | "unknown" | "success" | "error" | "replaced" = "pending"
): WalletTransactionEth => ({
  id: `0x${nonce.toString(16).padStart(64, "0")}`,
  platform: "ethereum",
  networkId: NETWORK_ID,
  account: ADDRESS,
  status,
  confirmed: status === "success",
  payload: { from: ADDRESS, nonce },
  hash: `0x${nonce.toString(16).padStart(64, "0")}`,
  nonce,
  timestamp: Date.now(),
})

describe("nonceManager", () => {
  beforeEach(async () => {
    // Clear the transactionsV2 table and in-memory nonce state between tests
    await db.transactionsV2.clear()
    _resetNonceState()
    vi.clearAllMocks()
    // Default: tx found in mempool (not dropped)
    mockGetTransaction.mockResolvedValue({ hash: "0x" })
  })

  it("returns on-chain nonce when no local pending transactions exist", async () => {
    mockGetTransactionCount.mockResolvedValue(5)

    const nonce = await getNextNonce(ADDRESS, NETWORK_ID)
    expect(nonce).toBe(5)
  })

  it("returns local nonce + 1 when a pending tx has a higher nonce than the chain", async () => {
    mockGetTransactionCount.mockResolvedValue(5)
    await db.transactionsV2.put(makeTx(7, "pending"))

    const nonce = await getNextNonce(ADDRESS, NETWORK_ID)
    expect(nonce).toBe(8) // max(5, 7+1) = 8
  })

  it("returns on-chain nonce when it is higher than local pending nonce", async () => {
    mockGetTransactionCount.mockResolvedValue(10)
    await db.transactionsV2.put(makeTx(7, "pending"))

    const nonce = await getNextNonce(ADDRESS, NETWORK_ID)
    expect(nonce).toBe(10) // max(10, 7+1) = 10
  })

  it("picks the highest nonce among multiple pending transactions", async () => {
    mockGetTransactionCount.mockResolvedValue(3)
    await db.transactionsV2.bulkPut([
      makeTx(3, "pending"),
      makeTx(5, "pending"),
      makeTx(4, "pending"),
    ])

    const nonce = await getNextNonce(ADDRESS, NETWORK_ID)
    expect(nonce).toBe(6) // max(3, 5+1) = 6
  })

  it("counts unknown-status transactions (not just pending)", async () => {
    mockGetTransactionCount.mockResolvedValue(3)
    await db.transactionsV2.put(makeTx(5, "unknown"))

    const nonce = await getNextNonce(ADDRESS, NETWORK_ID)
    expect(nonce).toBe(6) // max(3, 5+1) = 6
  })

  it("ignores confirmed (success) transactions", async () => {
    mockGetTransactionCount.mockResolvedValue(5)
    await db.transactionsV2.put(makeTx(7, "success"))

    const nonce = await getNextNonce(ADDRESS, NETWORK_ID)
    expect(nonce).toBe(5) // success txs are ignored, so just on-chain nonce
  })

  it("ignores error and replaced transactions", async () => {
    mockGetTransactionCount.mockResolvedValue(5)
    await db.transactionsV2.bulkPut([makeTx(8, "error"), makeTx(9, "replaced")])

    const nonce = await getNextNonce(ADDRESS, NETWORK_ID)
    expect(nonce).toBe(5)
  })

  it("filters by network — pending txs on other networks are ignored", async () => {
    mockGetTransactionCount.mockResolvedValue(3)

    const otherNetworkTx = makeTx(10, "pending")
    otherNetworkTx.networkId = "137" // polygon
    otherNetworkTx.id = "0xdifferent"
    await db.transactionsV2.put(otherNetworkTx)

    const nonce = await getNextNonce(ADDRESS, NETWORK_ID)
    expect(nonce).toBe(3) // the polygon tx should not affect mainnet nonce
  })

  it("filters by address — pending txs from other addresses are ignored", async () => {
    mockGetTransactionCount.mockResolvedValue(3)

    const otherAddrTx = makeTx(10, "pending")
    otherAddrTx.account = "0x2222222222222222222222222222222222222222"
    otherAddrTx.id = "0xdifferent"
    await db.transactionsV2.put(otherAddrTx)

    const nonce = await getNextNonce(ADDRESS, NETWORK_ID)
    expect(nonce).toBe(3)
  })

  it("is case-insensitive on address matching", async () => {
    mockGetTransactionCount.mockResolvedValue(3)

    const tx = makeTx(7, "pending")
    tx.account = ADDRESS.toUpperCase() as `0x${string}`
    await db.transactionsV2.put(tx)

    const nonce = await getNextNonce(ADDRESS, NETWORK_ID)
    expect(nonce).toBe(8) // should match despite case difference
  })

  it("throws when no provider is available", async () => {
    const { chainConnectorEvm } = await import("../../rpcs/chain-connector-evm")
    vi.mocked(chainConnectorEvm.getPublicClientForEvmNetwork).mockResolvedValueOnce(null as never)

    await expect(getNextNonce(ADDRESS, NETWORK_ID)).rejects.toThrow(
      "Could not find provider for EVM chain 1"
    )
  })

  describe("dropped transaction cleanup", () => {
    const makeTransactionNotFoundError = () => {
      const err = new Error("Transaction not found")
      err.name = "TransactionNotFoundError"
      return err
    }

    it("cleans up dropped unknown tx and returns on-chain nonce", async () => {
      mockGetTransactionCount.mockResolvedValue(5)
      mockGetTransaction.mockRejectedValue(makeTransactionNotFoundError())
      await db.transactionsV2.put(makeTx(5, "unknown"))

      const nonce = await getNextNonce(ADDRESS, NETWORK_ID)
      expect(nonce).toBe(5)

      const tx = await db.transactionsV2.get(makeTx(5).id)
      expect(tx?.status).toBe("error")
    })

    it("keeps unknown tx that is still in mempool", async () => {
      mockGetTransactionCount.mockResolvedValue(5)
      mockGetTransaction.mockResolvedValue({ hash: "0x" })
      await db.transactionsV2.put(makeTx(5, "unknown"))

      const nonce = await getNextNonce(ADDRESS, NETWORK_ID)
      expect(nonce).toBe(6)

      const tx = await db.transactionsV2.get(makeTx(5).id)
      expect(tx?.status).toBe("unknown")
    })

    it("leaves unknown tx when RPC error occurs (fail-safe)", async () => {
      mockGetTransactionCount.mockResolvedValue(5)
      mockGetTransaction.mockRejectedValue(new Error("RPC timeout"))
      await db.transactionsV2.put(makeTx(5, "unknown"))

      const nonce = await getNextNonce(ADDRESS, NETWORK_ID)
      expect(nonce).toBe(6)

      const tx = await db.transactionsV2.get(makeTx(5).id)
      expect(tx?.status).toBe("unknown")
    })

    it("does not trigger cleanup when on-chain nonce is already ahead", async () => {
      mockGetTransactionCount.mockResolvedValue(10)
      await db.transactionsV2.put(makeTx(5, "unknown"))

      const nonce = await getNextNonce(ADDRESS, NETWORK_ID)
      expect(nonce).toBe(10)
      expect(mockGetTransaction).not.toHaveBeenCalled()
    })

    it("recalculates correctly after cleaning multiple dropped txs", async () => {
      mockGetTransactionCount.mockResolvedValue(5)
      mockGetTransaction.mockRejectedValue(makeTransactionNotFoundError())
      await db.transactionsV2.bulkPut([
        makeTx(5, "unknown"),
        makeTx(6, "unknown"),
        makeTx(7, "unknown"),
      ])

      const nonce = await getNextNonce(ADDRESS, NETWORK_ID)
      expect(nonce).toBe(5) // all dropped → on-chain nonce
    })

    it("keeps valid pending tx even when unknown txs are dropped", async () => {
      mockGetTransactionCount.mockResolvedValue(5)
      mockGetTransaction.mockRejectedValue(makeTransactionNotFoundError())
      await db.transactionsV2.bulkPut([makeTx(5, "pending"), makeTx(7, "unknown")])

      const nonce = await getNextNonce(ADDRESS, NETWORK_ID)
      // unknown tx (7) cleaned up, but pending tx (5) stays → max(5, 5+1) = 6
      expect(nonce).toBe(6)
    })

    it("cleans up dropped stale pending tx and returns on-chain nonce", async () => {
      mockGetTransactionCount.mockResolvedValue(0)
      mockGetTransaction.mockRejectedValue(makeTransactionNotFoundError())

      const tx = makeTx(0, "pending")
      tx.timestamp = Date.now() - PENDING_TX_AGE_THRESHOLD_MS - 1000
      await db.transactionsV2.put(tx)

      const nonce = await getNextNonce(ADDRESS, NETWORK_ID)
      expect(nonce).toBe(0) // stale pending tx cleaned up → falls back to on-chain nonce

      const dbTx = await db.transactionsV2.get(tx.id)
      expect(dbTx?.status).toBe("error")
    })

    it("does not clean up recent pending tx even when dropped", async () => {
      mockGetTransactionCount.mockResolvedValue(0)
      mockGetTransaction.mockRejectedValue(makeTransactionNotFoundError())
      await db.transactionsV2.put(makeTx(0, "pending")) // timestamp = Date.now()

      const nonce = await getNextNonce(ADDRESS, NETWORK_ID)
      expect(nonce).toBe(1) // recent pending tx not checked → max(0, 0+1) = 1
    })
  })

  describe("concurrent nonce reservation", () => {
    it("assigns unique nonces across three concurrent callers", async () => {
      mockGetTransactionCount.mockResolvedValue(3)

      const [n1, n2, n3] = await Promise.all([
        getNextNonce(ADDRESS, NETWORK_ID),
        getNextNonce(ADDRESS, NETWORK_ID),
        getNextNonce(ADDRESS, NETWORK_ID),
      ])

      expect(new Set([n1, n2, n3]).size).toBe(3) // all unique
      expect(n1).toBe(3)
      expect(n2).toBe(4)
      expect(n3).toBe(5)
    })

    it("does not reserve nonce when reserve is false", async () => {
      mockGetTransactionCount.mockResolvedValue(5)

      const peek = await getNextNonce(ADDRESS, NETWORK_ID, { reserve: false })
      expect(peek).toBe(5)

      // Next call should still get 5 since the previous didn't reserve
      const nonce = await getNextNonce(ADDRESS, NETWORK_ID)
      expect(nonce).toBe(5)
    })

    it("releases reserved nonce so it can be reused", async () => {
      mockGetTransactionCount.mockResolvedValue(5)

      const nonce1 = await getNextNonce(ADDRESS, NETWORK_ID)
      expect(nonce1).toBe(5)

      // Simulate send failure — release the specific reserved nonce
      releaseReservedNonce(ADDRESS, NETWORK_ID, nonce1)

      const nonce2 = await getNextNonce(ADDRESS, NETWORK_ID)
      expect(nonce2).toBe(5) // reuses the released nonce
    })

    it("releasing one reservation preserves other in-flight reservations", async () => {
      mockGetTransactionCount.mockResolvedValue(5)

      // Handler A reserves nonce 5, Handler B reserves nonce 6
      const [nonce1, nonce2] = await Promise.all([
        getNextNonce(ADDRESS, NETWORK_ID),
        getNextNonce(ADDRESS, NETWORK_ID),
      ])
      expect(nonce1).toBe(5)
      expect(nonce2).toBe(6)

      // Handler B fails — release only nonce 6
      releaseReservedNonce(ADDRESS, NETWORK_ID, nonce2)

      // Handler C should get 6 (reuse of released), NOT 5 (still in-flight)
      const nonce3 = await getNextNonce(ADDRESS, NETWORK_ID)
      expect(nonce3).toBe(6)
    })
  })
})

describe("nonceManager with swap plans", () => {
  const T0 = 1_700_000_000_000

  const leg = (state: PlanLeg["state"], nonce?: number): PlanLeg => ({
    quote: {
      protocol: "forevermoney",
      fromTokenId: `${NETWORK_ID}:evm-native`,
      toTokenId: "8453:evm-erc20:0xf3081494b87e8d5fb7960f066e931d1d0e6e3d67",
      signer: ADDRESS,
      recipient: ADDRESS,
      inputAmount: "1",
      outputAmount: "1",
      fees: [],
      timeInSec: 1,
    },
    signerType: "keypair",
    bound: null,
    nonce,
    state,
  })

  const SENT: PlanLeg["state"] = {
    at: "sent",
    hash: makeTx(7).hash,
    sentAt: T0,
    deadlineAt: T0 + 60_000,
    evidence: { platform: "ethereum" },
  }

  const plan = (phase: SwapPlan["phase"], legs: [PlanLeg, ...PlanLeg[]]): SwapPlan => ({
    id: `plan-${phase}` as SwapPlanId,
    phase,
    createdAt: T0,
    updatedAt: T0,
    signUntil: null,
    summary: {
      fromTokenId: `${NETWORK_ID}:evm-native`,
      toTokenId: "8453:evm-erc20:0xf3081494b87e8d5fb7960f066e931d1d0e6e3d67",
      fromAmount: "1",
      quotedOutput: "1",
      recipient: ADDRESS,
      protocol: "forevermoney",
      slippage: 0.005,
    },
    intermediate: ADDRESS,
    legs,
  })

  beforeEach(async () => {
    await db.transactionsV2.clear()
    await db.swapPlans.clear()
    _resetNonceState()
    vi.clearAllMocks()
    mockGetTransaction.mockResolvedValue({ hash: "0x" })
  })

  it.each(["success", "error", "replaced"] as const)(
    "holds the nonce of a live plan's sent leg whose row says %s",
    async (status) => {
      mockGetTransactionCount.mockResolvedValue(7)
      await db.swapPlans.put(plan("running", [leg(SENT, 7)]))
      await db.transactionsV2.put(makeTx(7, status))

      expect(await getNextNonce(ADDRESS, NETWORK_ID)).toBe(8)
    }
  )

  it("holds the nonce of a live plan's sent leg that has no row", async () => {
    mockGetTransactionCount.mockResolvedValue(7)
    await db.swapPlans.put(plan("running", [leg(SENT, 7)]))

    expect(await getNextNonce(ADDRESS, NETWORK_ID)).toBe(8)
  })

  it("frees the nonce once the plan is over", async () => {
    mockGetTransactionCount.mockResolvedValue(7)
    await db.swapPlans.put(plan("stopped", [leg(SENT, 7)]))
    await db.transactionsV2.put(makeTx(7, "error"))

    expect(await getNextNonce(ADDRESS, NETWORK_ID)).toBe(7)
  })

  it("holds no nonce for a leg not sent yet, nor for another signer or network", async () => {
    mockGetTransactionCount.mockResolvedValue(7)
    const otherSigner = leg(SENT, 9)
    otherSigner.quote = {
      ...otherSigner.quote,
      signer: "0x2222222222222222222222222222222222222222",
    }
    const otherNetwork = leg(SENT, 9)
    otherNetwork.quote = { ...otherNetwork.quote, fromTokenId: "8453:evm-native" }
    await db.swapPlans.put(plan("running", [leg({ at: "queued" }, 9), otherSigner, otherNetwork]))

    expect(await getNextNonce(ADDRESS, NETWORK_ID)).toBe(7)
  })
})
