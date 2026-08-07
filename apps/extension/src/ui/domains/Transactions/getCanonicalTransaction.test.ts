import { db } from "@core/db"
import type { WalletTransactionEth } from "@core/domains/transactions/types"
import { beforeEach, describe, expect, it } from "vitest"

import { getCanonicalTransaction } from "./getCanonicalTransaction"

const ACCOUNT = "0x1111111111111111111111111111111111111111" as `0x${string}`
const OTHER_ACCOUNT = "0x2222222222222222222222222222222222222222" as `0x${string}`
const ROUTER = "0x9999999999999999999999999999999999999999" as `0x${string}`
const NETWORK_ID = "1"

const HASH_ORIGINAL = "0xaaaa000000000000000000000000000000000000000000000000000000000001"
const HASH_REPLACEMENT = "0xbbbb000000000000000000000000000000000000000000000000000000000002"

const makeEvmTx = (
  hash: string,
  status: WalletTransactionEth["status"],
  {
    account = ACCOUNT,
    networkId = NETWORK_ID,
    nonce = 5,
    isReplacement = false,
    to = ROUTER,
    value = "0xde0b6b3a7640000",
    // null = omit the data field, as with real cancel transactions
    data = "0x12345678" as `0x${string}` | null,
  }: Partial<{
    account: `0x${string}`
    networkId: string
    nonce: number
    isReplacement: boolean
    to: `0x${string}`
    value: string
    data: `0x${string}` | null
  }> = {}
): WalletTransactionEth => ({
  id: hash,
  platform: "ethereum",
  networkId,
  account,
  status,
  confirmed: false,
  payload: { from: account, nonce, to, value, ...(data === null ? {} : { data }) },
  hash: hash as `0x${string}`,
  nonce,
  isReplacement,
  timestamp: Date.now(),
})

describe("getCanonicalTransaction", () => {
  beforeEach(async () => {
    await db.transactionsV2.clear()
  })

  it("returns null for an unknown hash", async () => {
    expect(await getCanonicalTransaction(HASH_ORIGINAL)).toBeNull()
  })

  it("returns the tx as-is when pending", async () => {
    await db.transactionsV2.put(makeEvmTx(HASH_ORIGINAL, "pending"))

    const tx = await getCanonicalTransaction(HASH_ORIGINAL)
    expect(tx?.id).toBe(HASH_ORIGINAL)
    expect(tx?.status).toBe("pending")
  })

  it("returns the tx as-is when success", async () => {
    await db.transactionsV2.put(makeEvmTx(HASH_ORIGINAL, "success"))

    const tx = await getCanonicalTransaction(HASH_ORIGINAL)
    expect(tx?.id).toBe(HASH_ORIGINAL)
    expect(tx?.status).toBe("success")
  })

  it("follows the mined speed-up when the original was replaced", async () => {
    await db.transactionsV2.put(makeEvmTx(HASH_ORIGINAL, "replaced"))
    await db.transactionsV2.put(makeEvmTx(HASH_REPLACEMENT, "success", { isReplacement: true }))

    const tx = await getCanonicalTransaction(HASH_ORIGINAL)
    expect(tx?.id).toBe(HASH_REPLACEMENT)
    expect(tx?.status).toBe("success")
  })

  it("follows the mined original when the speed-up lost the nonce race", async () => {
    await db.transactionsV2.put(makeEvmTx(HASH_ORIGINAL, "success"))
    await db.transactionsV2.put(makeEvmTx(HASH_REPLACEMENT, "replaced", { isReplacement: true }))

    const tx = await getCanonicalTransaction(HASH_REPLACEMENT)
    expect(tx?.id).toBe(HASH_ORIGINAL)
    expect(tx?.status).toBe("success")
  })

  it("follows the mined speed-up even when it failed on-chain", async () => {
    await db.transactionsV2.put(makeEvmTx(HASH_ORIGINAL, "replaced"))
    await db.transactionsV2.put(makeEvmTx(HASH_REPLACEMENT, "error", { isReplacement: true }))

    const tx = await getCanonicalTransaction(HASH_ORIGINAL)
    expect(tx?.id).toBe(HASH_REPLACEMENT)
    expect(tx?.status).toBe("error")
  })

  it("keeps the replaced status when the winner is a cancel", async () => {
    await db.transactionsV2.put(makeEvmTx(HASH_ORIGINAL, "replaced"))
    await db.transactionsV2.put(
      makeEvmTx(HASH_REPLACEMENT, "success", {
        isReplacement: true,
        to: ACCOUNT,
        value: "0x0",
        data: null,
      })
    )

    const tx = await getCanonicalTransaction(HASH_ORIGINAL)
    expect(tx?.id).toBe(HASH_ORIGINAL)
    expect(tx?.status).toBe("replaced")
  })

  it("does not mistake a zero-value speed-up with calldata for a cancel", async () => {
    // ERC-20 swaps have value 0 but carry calldata — only a bare self-transfer is a cancel
    await db.transactionsV2.put(makeEvmTx(HASH_ORIGINAL, "replaced"))
    await db.transactionsV2.put(
      makeEvmTx(HASH_REPLACEMENT, "success", { isReplacement: true, value: "0x0" })
    )

    const tx = await getCanonicalTransaction(HASH_ORIGINAL)
    expect(tx?.id).toBe(HASH_REPLACEMENT)
  })

  it("keeps the replaced status when no same-nonce tx has mined", async () => {
    await db.transactionsV2.put(makeEvmTx(HASH_ORIGINAL, "replaced"))
    await db.transactionsV2.put(makeEvmTx(HASH_REPLACEMENT, "pending", { isReplacement: true }))

    const tx = await getCanonicalTransaction(HASH_ORIGINAL)
    expect(tx?.id).toBe(HASH_ORIGINAL)
    expect(tx?.status).toBe("replaced")
  })

  it("ignores mined txs from other accounts, nonces or networks", async () => {
    await db.transactionsV2.put(makeEvmTx(HASH_ORIGINAL, "replaced"))
    await db.transactionsV2.put(
      makeEvmTx("0xcccc000000000000000000000000000000000000000000000000000000000003", "success", {
        account: OTHER_ACCOUNT,
      })
    )
    await db.transactionsV2.put(
      makeEvmTx("0xdddd000000000000000000000000000000000000000000000000000000000004", "success", {
        nonce: 6,
      })
    )
    await db.transactionsV2.put(
      makeEvmTx("0xeeee000000000000000000000000000000000000000000000000000000000005", "success", {
        networkId: "137",
      })
    )

    const tx = await getCanonicalTransaction(HASH_ORIGINAL)
    expect(tx?.id).toBe(HASH_ORIGINAL)
    expect(tx?.status).toBe("replaced")
  })
})
