import type {
  WalletTransactionDot,
  WalletTransactionEth,
  WalletTransactionSol,
} from "@core/domains/transactions/types"
import { beforeEach, describe, expect, it, vi } from "vitest"

// --- Mocks ---

const mockGetTransaction = vi.fn()
vi.mock("../../rpcs/chain-connector-evm", () => ({
  chainConnectorEvm: {
    getPublicClientForEvmNetwork: vi.fn().mockResolvedValue({
      getTransaction: (args: { hash: string }) => mockGetTransaction(args),
    }),
  },
}))

const mockChainConnectorSend = vi.fn()
vi.mock("../../rpcs/chain-connector", () => ({
  chainConnector: {
    send: (...args: unknown[]) => mockChainConnectorSend(...args),
  },
}))

const mockGetSignatureStatuses = vi.fn()
vi.mock("../../rpcs/chain-connector-sol", () => ({
  chainConnectorSol: {
    getConnection: vi.fn().mockResolvedValue({
      getSignatureStatuses: (...args: unknown[]) => mockGetSignatureStatuses(...args),
    }),
  },
}))

import { db } from "../../db"
import {
  cleanupAllDroppedTransactions,
  cleanupDroppedEvmTransactions,
} from "./cleanupDroppedTransactions"

// --- Helpers ---

const makeEvmTx = (
  nonce: number,
  status: "unknown" | "pending" | "success" | "error" = "unknown",
  networkId = "1",
  account = "0x1111111111111111111111111111111111111111"
): WalletTransactionEth => ({
  id: `evm-${networkId}-${nonce}`,
  platform: "ethereum",
  networkId,
  account: account as `0x${string}`,
  status,
  confirmed: false,
  payload: { from: account as `0x${string}`, nonce },
  hash: `0x${nonce.toString(16).padStart(64, "0")}` as `0x${string}`,
  nonce,
  timestamp: Date.now(),
})

const makeSubstrateTx = (
  nonce: number,
  status: "unknown" | "pending" | "success" | "error" = "unknown",
  networkId = "polkadot",
  account = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
): WalletTransactionDot => ({
  id: `sub-${networkId}-${nonce}`,
  platform: "polkadot",
  networkId,
  account,
  status,
  confirmed: false,
  hash: `0x${nonce.toString(16).padStart(64, "0")}` as `0x${string}`,
  nonce,
  payload: {} as WalletTransactionDot["payload"],
  timestamp: Date.now(),
})

const makeSolanaTx = (
  signature: string,
  status: "unknown" | "pending" | "success" | "error" = "unknown",
  networkId = "solana:101",
  account = "11111111111111111111111111111111"
): WalletTransactionSol => ({
  id: `sol-${signature}`,
  platform: "solana",
  networkId,
  account,
  status,
  confirmed: false,
  payload: "",
  signature,
  timestamp: Date.now(),
})

const makeTransactionNotFoundError = () => {
  const err = new Error("Transaction not found")
  err.name = "TransactionNotFoundError"
  return err
}

describe("cleanupDroppedTransactions", () => {
  beforeEach(async () => {
    await db.transactionsV2.clear()
    vi.clearAllMocks()
  })

  describe("EVM — cleanupDroppedEvmTransactions", () => {
    it("marks unknown tx as error when not found in mempool", async () => {
      mockGetTransaction.mockRejectedValue(makeTransactionNotFoundError())
      await db.transactionsV2.put(makeEvmTx(5))

      const cleaned = await cleanupDroppedEvmTransactions(
        "0x1111111111111111111111111111111111111111",
        "1"
      )

      expect(cleaned).toBe(true)
      const tx = await db.transactionsV2.get("evm-1-5")
      expect(tx?.status).toBe("error")
    })

    it("leaves unknown tx when found in mempool", async () => {
      mockGetTransaction.mockResolvedValue({ hash: "0x..." })
      await db.transactionsV2.put(makeEvmTx(5))

      const cleaned = await cleanupDroppedEvmTransactions(
        "0x1111111111111111111111111111111111111111",
        "1"
      )

      expect(cleaned).toBe(false)
      const tx = await db.transactionsV2.get("evm-1-5")
      expect(tx?.status).toBe("unknown")
    })

    it("leaves unknown tx on RPC error (fail-safe)", async () => {
      mockGetTransaction.mockRejectedValue(new Error("RPC timeout"))
      await db.transactionsV2.put(makeEvmTx(5))

      const cleaned = await cleanupDroppedEvmTransactions(
        "0x1111111111111111111111111111111111111111",
        "1"
      )

      expect(cleaned).toBe(false)
      const tx = await db.transactionsV2.get("evm-1-5")
      expect(tx?.status).toBe("unknown")
    })

    it("only cleans txs for the specified address and network", async () => {
      mockGetTransaction.mockRejectedValue(makeTransactionNotFoundError())
      await db.transactionsV2.bulkPut([
        makeEvmTx(5, "unknown", "1", "0x1111111111111111111111111111111111111111"),
        makeEvmTx(6, "unknown", "137", "0x1111111111111111111111111111111111111111"), // different network
        makeEvmTx(7, "unknown", "1", "0x2222222222222222222222222222222222222222"), // different address
      ])

      await cleanupDroppedEvmTransactions("0x1111111111111111111111111111111111111111", "1")

      expect((await db.transactionsV2.get("evm-1-5"))?.status).toBe("error")
      expect((await db.transactionsV2.get("evm-137-6"))?.status).toBe("unknown")
      expect((await db.transactionsV2.get("evm-1-7"))?.status).toBe("unknown")
    })

    it("returns false when no unknown txs exist", async () => {
      const cleaned = await cleanupDroppedEvmTransactions(
        "0x1111111111111111111111111111111111111111",
        "1"
      )
      expect(cleaned).toBe(false)
    })
  })

  describe("Substrate — cleanupAllDroppedTransactions", () => {
    it("marks unknown substrate tx as error when nonce not consumed", async () => {
      mockChainConnectorSend.mockResolvedValue(5) // on-chain next index = 5
      await db.transactionsV2.put(makeSubstrateTx(5)) // tx has nonce 5

      await cleanupAllDroppedTransactions()

      const tx = await db.transactionsV2.get("sub-polkadot-5")
      expect(tx?.status).toBe("error")
    })

    it("leaves unknown substrate tx when nonce was consumed", async () => {
      mockChainConnectorSend.mockResolvedValue(6) // next index = 6, nonce 5 consumed
      await db.transactionsV2.put(makeSubstrateTx(5))

      await cleanupAllDroppedTransactions()

      const tx = await db.transactionsV2.get("sub-polkadot-5")
      expect(tx?.status).toBe("unknown")
    })

    it("leaves substrate tx when chain is unavailable (fail-safe)", async () => {
      mockChainConnectorSend.mockRejectedValue(new Error("Chain unavailable"))
      await db.transactionsV2.put(makeSubstrateTx(5))

      await cleanupAllDroppedTransactions()

      const tx = await db.transactionsV2.get("sub-polkadot-5")
      expect(tx?.status).toBe("unknown")
    })
  })

  describe("Solana — cleanupAllDroppedTransactions", () => {
    it("marks unknown solana tx as error when signature not found", async () => {
      mockGetSignatureStatuses.mockResolvedValue({ value: [null] })
      await db.transactionsV2.put(makeSolanaTx("sig1"))

      await cleanupAllDroppedTransactions()

      const tx = await db.transactionsV2.get("sol-sig1")
      expect(tx?.status).toBe("error")
    })

    it("marks unknown solana tx as error when tx failed on-chain", async () => {
      mockGetSignatureStatuses.mockResolvedValue({
        value: [{ confirmationStatus: "finalized", err: { InstructionError: [0, "Custom"] } }],
      })
      await db.transactionsV2.put(makeSolanaTx("sig1"))

      await cleanupAllDroppedTransactions()

      const tx = await db.transactionsV2.get("sol-sig1")
      expect(tx?.status).toBe("error")
    })

    it("recovers unknown solana tx to success when confirmed", async () => {
      mockGetSignatureStatuses.mockResolvedValue({
        value: [{ confirmationStatus: "confirmed", err: null }],
      })
      await db.transactionsV2.put(makeSolanaTx("sig1"))

      await cleanupAllDroppedTransactions()

      const tx = await db.transactionsV2.get("sol-sig1")
      expect(tx?.status).toBe("success")
    })

    it("recovers unknown solana tx to finalized success", async () => {
      mockGetSignatureStatuses.mockResolvedValue({
        value: [{ confirmationStatus: "finalized", err: null }],
      })
      await db.transactionsV2.put(makeSolanaTx("sig1"))

      await cleanupAllDroppedTransactions()

      const tx = await db.transactionsV2.get("sol-sig1")
      expect(tx?.status).toBe("success")
      expect(tx?.confirmed).toBe(true)
    })

    it("leaves solana tx when connection unavailable (fail-safe)", async () => {
      const { chainConnectorSol } = await import("../../rpcs/chain-connector-sol")
      vi.mocked(chainConnectorSol.getConnection).mockRejectedValueOnce(
        new Error("Connection failed")
      )
      await db.transactionsV2.put(makeSolanaTx("sig1"))

      await cleanupAllDroppedTransactions()

      const tx = await db.transactionsV2.get("sol-sig1")
      expect(tx?.status).toBe("unknown")
    })
  })

  describe("cleanupAllDroppedTransactions — cross-platform", () => {
    it("handles all platforms concurrently", async () => {
      mockGetTransaction.mockRejectedValue(makeTransactionNotFoundError())
      mockChainConnectorSend.mockResolvedValue(5) // next index = 5, nonce 5 → dropped
      mockGetSignatureStatuses.mockResolvedValue({ value: [null] })

      await db.transactionsV2.bulkPut([makeEvmTx(5), makeSubstrateTx(5), makeSolanaTx("sig1")])

      await cleanupAllDroppedTransactions()

      expect((await db.transactionsV2.get("evm-1-5"))?.status).toBe("error")
      expect((await db.transactionsV2.get("sub-polkadot-5"))?.status).toBe("error")
      expect((await db.transactionsV2.get("sol-sig1"))?.status).toBe("error")
    })

    it("does nothing when no unknown txs exist", async () => {
      await db.transactionsV2.put(makeEvmTx(5, "success"))

      await cleanupAllDroppedTransactions()

      expect((await db.transactionsV2.get("evm-1-5"))?.status).toBe("success")
      expect(mockGetTransaction).not.toHaveBeenCalled()
      expect(mockChainConnectorSend).not.toHaveBeenCalled()
      expect(mockGetSignatureStatuses).not.toHaveBeenCalled()
    })
  })
})
