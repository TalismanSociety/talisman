import type { WalletTransactionEth } from "@core/domains/transactions/types"
import { beforeEach, describe, expect, it } from "vitest"

import { db } from "../../db"
import { addEvmTransaction } from "./helpers"

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
    hashSuffix = "",
  }: { networkId?: string; account?: `0x${string}`; hashSuffix?: string } = {}
): WalletTransactionEth => ({
  id: `0x${(nonce.toString(16) + hashSuffix).padStart(64, "0")}`,
  platform: "ethereum",
  networkId,
  account,
  status,
  confirmed: false,
  payload: { from: account, nonce },
  hash: `0x${(nonce.toString(16) + hashSuffix).padStart(64, "0")}` as `0x${string}`,
  nonce,
  timestamp: Date.now(),
})

const getEvmTx = async (hash: string) => {
  const tx = await db.transactionsV2.get(hash)
  if (tx?.platform !== "ethereum") throw new Error(`Expected ethereum tx, got ${tx?.platform}`)
  return tx
}

describe("addEvmTransaction — isReplacement", () => {
  beforeEach(async () => {
    await db.transactionsV2.clear()
  })

  it("sets isReplacement=false when no existing tx with same nonce", async () => {
    const hash = "0xaaaa000000000000000000000000000000000000000000000000000000000001" as const
    await addEvmTransaction(NETWORK_ID, hash, { from: ACCOUNT_A, nonce: 5 })

    const tx = await getEvmTx(hash)
    expect(tx?.isReplacement).toBe(false)
  })

  it("sets isReplacement=true when a pending tx with same nonce and account exists", async () => {
    await db.transactionsV2.put(makeEvmTx(5, "pending"))

    const hash = "0xaaaa000000000000000000000000000000000000000000000000000000000002" as const
    await addEvmTransaction(NETWORK_ID, hash, { from: ACCOUNT_A, nonce: 5 })

    const tx = await getEvmTx(hash)
    expect(tx?.isReplacement).toBe(true)
  })

  it("sets isReplacement=false when existing same-nonce tx has error status", async () => {
    await db.transactionsV2.put(makeEvmTx(5, "error"))

    const hash = "0xaaaa000000000000000000000000000000000000000000000000000000000003" as const
    await addEvmTransaction(NETWORK_ID, hash, { from: ACCOUNT_A, nonce: 5 })

    const tx = await getEvmTx(hash)
    expect(tx?.isReplacement).toBe(false)
  })

  it("sets isReplacement=false when existing same-nonce tx has unknown status", async () => {
    await db.transactionsV2.put(makeEvmTx(5, "unknown"))

    const hash = "0xaaaa000000000000000000000000000000000000000000000000000000000004" as const
    await addEvmTransaction(NETWORK_ID, hash, { from: ACCOUNT_A, nonce: 5 })

    const tx = await getEvmTx(hash)
    expect(tx?.isReplacement).toBe(false)
  })

  it("sets isReplacement=false when existing same-nonce tx has replaced status", async () => {
    await db.transactionsV2.put(makeEvmTx(5, "replaced"))

    const hash = "0xaaaa000000000000000000000000000000000000000000000000000000000005" as const
    await addEvmTransaction(NETWORK_ID, hash, { from: ACCOUNT_A, nonce: 5 })

    const tx = await getEvmTx(hash)
    expect(tx?.isReplacement).toBe(false)
  })

  it("sets isReplacement=false when existing same-nonce tx has success status", async () => {
    await db.transactionsV2.put(makeEvmTx(5, "success"))

    const hash = "0xaaaa000000000000000000000000000000000000000000000000000000000006" as const
    await addEvmTransaction(NETWORK_ID, hash, { from: ACCOUNT_A, nonce: 5 })

    const tx = await getEvmTx(hash)
    expect(tx?.isReplacement).toBe(false)
  })

  it("sets isReplacement=false when same nonce exists but for a different account", async () => {
    await db.transactionsV2.put(makeEvmTx(5, "pending", { account: ACCOUNT_B }))

    const hash = "0xaaaa000000000000000000000000000000000000000000000000000000000007" as const
    await addEvmTransaction(NETWORK_ID, hash, { from: ACCOUNT_A, nonce: 5 })

    const tx = await getEvmTx(hash)
    expect(tx?.isReplacement).toBe(false)
  })

  it("sets isReplacement=false when same nonce exists but on a different network", async () => {
    await db.transactionsV2.put(makeEvmTx(5, "pending", { networkId: "137" }))

    const hash = "0xaaaa000000000000000000000000000000000000000000000000000000000008" as const
    await addEvmTransaction(NETWORK_ID, hash, { from: ACCOUNT_A, nonce: 5 })

    const tx = await getEvmTx(hash)
    expect(tx?.isReplacement).toBe(false)
  })
})
