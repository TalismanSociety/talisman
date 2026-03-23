import type { WalletTransactionEth } from "@core/domains/transactions/types"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock chainConnectorEvm before importing the module under test
const mockGetTransactionCount = vi.fn<() => Promise<number>>()

vi.mock("../../rpcs/chain-connector-evm", () => ({
  chainConnectorEvm: {
    getPublicClientForEvmNetwork: vi.fn().mockResolvedValue({
      getTransactionCount: (_args: { address: string }) => mockGetTransactionCount(),
    }),
  },
}))

// Use real Dexie with fake-indexeddb (auto-imported in setup)
import { db } from "../../db"
import { getNextNonce } from "./nonceManager"

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
    // Clear the transactionsV2 table between tests
    await db.transactionsV2.clear()
    vi.clearAllMocks()
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
})
