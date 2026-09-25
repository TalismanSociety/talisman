import type { SolTransaction } from "@talismn/solana"
import { beforeEach, describe, expect, it, vi } from "vitest"

// --- Mocks ---

const SIGNATURE = "sig1"
const NETWORK_ID = "solana-mainnet"

vi.mock("@talismn/solana", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@talismn/solana")>()),
  parseTransactionInfo: () => ({ signature: SIGNATURE, address: "acct1", feePayer: "acct1" }),
  serializeTransaction: () => "serialized",
}))

vi.mock("@talismn/chaindata-provider", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@talismn/chaindata-provider")>()),
  getBlockExplorerUrls: () => ["https://explorer.test/tx/sig1"],
}))

vi.mock("../../rpcs/chaindata", () => ({
  chaindataProvider: { getNetworkById: vi.fn().mockResolvedValue({ name: "Solana" }) },
}))

const mockGetSignatureStatuses = vi.fn()
const mockGetTransaction = vi.fn()
vi.mock("../../rpcs/chain-connector-sol", () => ({
  chainConnectorSol: {
    getRpc: vi.fn().mockResolvedValue({
      getSignatureStatuses: () => ({ send: () => mockGetSignatureStatuses() }),
      getTransaction: () => ({ send: () => mockGetTransaction() }),
    }),
  },
}))

const mockCreateNotification = vi.fn()
vi.mock("../../notifications", () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}))

const mockWatchSwapStatus = vi.fn()
vi.mock("./watchSwapStatus", () => ({
  watchSwapStatus: (...args: unknown[]) => mockWatchSwapStatus(...args),
}))

vi.mock("../../config/sentry", () => ({ sentry: { captureException: vi.fn() } }))

import { db } from "../../db"
import type { WalletTransactionInfo } from "./types"
import { watchSolanaTransaction } from "./watchSolanaTransaction"

// --- Helpers ---

const TRANSACTION = {} as SolTransaction
const TX_INFO = { type: "swap" } as unknown as WalletTransactionInfo

const watch = () =>
  watchSolanaTransaction(NETWORK_ID, TRANSACTION, { notifications: true, txInfo: TX_INFO })

const getTx = () => db.transactionsV2.get(SIGNATURE)

describe("watchSolanaTransaction", () => {
  beforeEach(async () => {
    await db.transactionsV2.clear()
    vi.clearAllMocks()
    mockGetTransaction.mockResolvedValue({ slot: 100n })
  })

  it("reports success when the first poll already returns finalized", async () => {
    mockGetSignatureStatuses.mockResolvedValue({
      value: [{ confirmationStatus: "finalized", err: null }],
    })

    await watch()

    await vi.waitFor(async () => {
      const tx = await getTx()
      expect(tx?.status).toBe("success")
      expect(tx?.confirmed).toBe(true)
    })
    expect(mockCreateNotification).toHaveBeenCalledWith(
      "success",
      "Solana",
      "https://explorer.test/tx/sig1"
    )
    expect(mockWatchSwapStatus).toHaveBeenCalledWith(SIGNATURE)
  })

  it("notifies once when a confirmed tx is later finalized", async () => {
    mockGetSignatureStatuses
      .mockResolvedValueOnce({ value: [{ confirmationStatus: "confirmed", err: null }] })
      .mockResolvedValue({ value: [{ confirmationStatus: "finalized", err: null }] })

    await watch()

    await vi.waitFor(
      async () => {
        expect((await getTx())?.confirmed).toBe(true)
      },
      { timeout: 10_000 }
    )
    expect((await getTx())?.status).toBe("success")
    expect(mockCreateNotification).toHaveBeenCalledTimes(1)
    expect(mockWatchSwapStatus).toHaveBeenCalledTimes(1)
  })

  it("reports a failed tx as error", async () => {
    mockGetSignatureStatuses.mockResolvedValue({
      value: [{ confirmationStatus: "finalized", err: { InstructionError: [0, "Custom"] } }],
    })

    await watch()

    await vi.waitFor(async () => {
      expect((await getTx())?.status).toBe("error")
    })
    expect(mockCreateNotification).toHaveBeenCalledWith(
      "error",
      "Solana",
      "https://explorer.test/tx/sig1"
    )
    expect(mockWatchSwapStatus).not.toHaveBeenCalled()
  })
})
