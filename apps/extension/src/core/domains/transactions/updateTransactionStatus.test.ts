import type { WalletTransactionEth } from "@core/domains/transactions/types"
import { beforeEach, describe, expect, it } from "vitest"

import { db } from "../../db"
import { updateTransactionStatus } from "./helpers"

// --- Helpers ---

const ACCOUNT_A = "0x1111111111111111111111111111111111111111" as `0x${string}`
const ACCOUNT_B = "0x2222222222222222222222222222222222222222" as `0x${string}`
const NETWORK_ID = "1"

const makeEvmTx = (
  nonce: number,
  status: WalletTransactionEth["status"] = "pending",
  {
    networkId = NETWORK_ID,
    account = ACCOUNT_A,
    confirmed = false,
  }: { networkId?: string; account?: `0x${string}`; confirmed?: boolean } = {}
): WalletTransactionEth => ({
  id: `${networkId}-${account}-${nonce}`,
  platform: "ethereum",
  networkId,
  account,
  status,
  confirmed,
  payload: { from: account, nonce },
  hash: `0x${nonce.toString(16).padStart(64, "0")}` as `0x${string}`,
  nonce,
  timestamp: Date.now(),
})

const idOf = (nonce: number, account = ACCOUNT_A, networkId = NETWORK_ID) =>
  `${networkId}-${account}-${nonce}`

describe("updateTransactionStatus", () => {
  beforeEach(async () => {
    await db.transactionsV2.clear()
  })

  it("returns false for an unknown id", async () => {
    expect(await updateTransactionStatus("nope", "success")).toBe(false)
  })

  it("updates a pending tx and stores the block number", async () => {
    await db.transactionsV2.put(makeEvmTx(5))

    expect(await updateTransactionStatus(idOf(5), "success", 42n, true)).toBe(true)

    const tx = await db.transactionsV2.get(idOf(5))
    expect(tx?.status).toBe("success")
    expect(tx?.confirmed).toBe(true)
    expect(tx?.platform === "ethereum" && tx.blockNumber).toBe("42")
  })

  it("upgrades an unconfirmed terminal status to confirmed", async () => {
    await db.transactionsV2.put(makeEvmTx(5, "success"))

    expect(await updateTransactionStatus(idOf(5), "success", undefined, true)).toBe(true)

    const tx = await db.transactionsV2.get(idOf(5))
    expect(tx?.status).toBe("success")
    expect(tx?.confirmed).toBe(true)
  })

  it("keeps a confirmed terminal status immutable", async () => {
    await db.transactionsV2.put(makeEvmTx(5, "success", { confirmed: true }))

    expect(await updateTransactionStatus(idOf(5), "error")).toBe(false)
    expect(await updateTransactionStatus(idOf(5), "error", undefined, true)).toBe(false)
    expect(await updateTransactionStatus(idOf(5), "unknown")).toBe(false)

    const tx = await db.transactionsV2.get(idOf(5))
    expect(tx?.status).toBe("success")
    expect(tx?.confirmed).toBe(true)
  })

  it("refuses an unconfirmed status over an unconfirmed terminal status", async () => {
    await db.transactionsV2.put(makeEvmTx(5, "success"))

    expect(await updateTransactionStatus(idOf(5), "unknown")).toBe(false)

    const tx = await db.transactionsV2.get(idOf(5))
    expect(tx?.status).toBe("success")
  })

  it("keeps the confirmed result when a concurrent writer reports another status", async () => {
    await db.transactionsV2.put(makeEvmTx(5))

    await Promise.all([
      updateTransactionStatus(idOf(5), "success", 42n, true),
      updateTransactionStatus(idOf(5), "unknown"),
    ])

    const tx = await db.transactionsV2.get(idOf(5))
    expect(tx?.status).toBe("success")
    expect(tx?.confirmed).toBe(true)
  })

  it("marks same-nonce pending txs of the same account as replaced", async () => {
    await db.transactionsV2.bulkPut([
      makeEvmTx(5),
      { ...makeEvmTx(5), id: "speedup" },
      makeEvmTx(5, "pending", { account: ACCOUNT_B }),
      makeEvmTx(5, "pending", { networkId: "137" }),
    ])

    await updateTransactionStatus(idOf(5), "success", undefined, true)

    expect((await db.transactionsV2.get("speedup"))?.status).toBe("replaced")
    expect((await db.transactionsV2.get(idOf(5, ACCOUNT_B)))?.status).toBe("pending")
    expect((await db.transactionsV2.get(idOf(5, ACCOUNT_A, "137")))?.status).toBe("pending")
  })

  it("marks lower-nonce pending txs of the same account as unknown", async () => {
    await db.transactionsV2.bulkPut([makeEvmTx(5), makeEvmTx(4), makeEvmTx(6)])

    await updateTransactionStatus(idOf(5), "success", undefined, true)

    expect((await db.transactionsV2.get(idOf(4)))?.status).toBe("unknown")
    expect((await db.transactionsV2.get(idOf(6)))?.status).toBe("pending")
  })
})
