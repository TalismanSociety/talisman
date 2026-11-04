import { db } from "@core/db"
import type { WalletTransactionDot, WalletTransactionEth } from "@core/domains/transactions/types"
import type { Hex } from "viem"
import { beforeEach, describe, expect, it } from "vitest"
import { uiSwapEnv } from "../swapEnv.ui"

const ACCOUNT = "0x1111111111111111111111111111111111111111" as const
const OTHER = "0x2222222222222222222222222222222222222222" as const
const hashOf = (n: number): Hex => `0x${n.toString(16).padStart(64, "0")}`
const ORIGINAL = hashOf(1)
const REPLACEMENT = hashOf(2)

const evmRow = (
  hash: Hex,
  overrides: Partial<WalletTransactionEth> = {}
): WalletTransactionEth => ({
  id: hash,
  hash,
  platform: "ethereum",
  networkId: "1",
  account: ACCOUNT,
  status: "pending",
  confirmed: false,
  payload: { from: ACCOUNT, to: OTHER, data: "0xa9059cbb", nonce: 7 },
  nonce: 7,
  timestamp: Date.now(),
  ...overrides,
})

const substrateRow = (overrides: Partial<WalletTransactionDot> = {}): WalletTransactionDot => ({
  id: ORIGINAL,
  hash: ORIGINAL,
  platform: "polkadot",
  networkId: "bittensor",
  account: "5GW7UHZ9tLocJUaMXFWkr48QHgVoq5tVR1az62mknFacM3cu",
  status: "pending",
  confirmed: false,
  payload: {} as WalletTransactionDot["payload"],
  nonce: 3,
  timestamp: Date.now(),
  ...overrides,
})

const wait = (hash: Hex, signal = new AbortController().signal) =>
  uiSwapEnv.waitForTransaction("1", hash, signal)

const STILL_WAITING = Symbol("still waiting")

const within = <T>(promise: Promise<T>, ms = 100) =>
  Promise.race([
    promise,
    new Promise<typeof STILL_WAITING>((r) => setTimeout(r, ms, STILL_WAITING)),
  ])

describe("uiSwapEnv.waitForTransaction", () => {
  beforeEach(async () => {
    await db.transactionsV2.clear()
  })

  it("waits for a success to be final", async () => {
    await db.transactionsV2.put(evmRow(ORIGINAL, { status: "success" }))
    const settled = wait(ORIGINAL)
    expect(await within(settled)).toBe(STILL_WAITING)

    await db.transactionsV2.update(ORIGINAL, { confirmed: true })
    expect(await settled).toEqual({ landed: true, hash: ORIGINAL })
  })

  it("settles a success the background marked finished before it was final", async () => {
    await db.transactionsV2.put(substrateRow({ status: "success", swapStatus: "finished" }))
    expect(await wait(ORIGINAL)).toEqual({ landed: true, hash: ORIGINAL })
  })

  it.each([
    ["error", "failed"],
    ["unknown", "untracked"],
  ] as const)("stops on %s as %s", async (status, stop) => {
    await db.transactionsV2.put(evmRow(ORIGINAL, { status }))
    expect(await wait(ORIGINAL)).toEqual({ landed: false, hash: ORIGINAL, stop })
  })

  it("stops as cancelled when a cancel took the nonce", async () => {
    await db.transactionsV2.bulkPut([
      evmRow(ORIGINAL, { status: "replaced" }),
      evmRow(REPLACEMENT, {
        status: "success",
        confirmed: true,
        isReplacement: true,
        payload: { from: ACCOUNT, to: ACCOUNT, value: "0", nonce: 7 },
      }),
    ])
    expect(await wait(ORIGINAL)).toEqual({ landed: false, hash: ORIGINAL, stop: "cancelled" })
  })

  it("follows a speed-up to its final success", async () => {
    await db.transactionsV2.bulkPut([
      evmRow(ORIGINAL, { status: "replaced" }),
      evmRow(REPLACEMENT, { status: "success", isReplacement: true }),
    ])
    const settled = wait(ORIGINAL)
    expect(await within(settled)).toBe(STILL_WAITING)

    await db.transactionsV2.update(REPLACEMENT, { confirmed: true })
    expect(await settled).toEqual({ landed: true, hash: REPLACEMENT })
  })

  it("rejects once aborted", async () => {
    await db.transactionsV2.put(evmRow(ORIGINAL))
    const controller = new AbortController()
    const settled = wait(ORIGINAL, controller.signal)
    controller.abort()
    await expect(settled).rejects.toThrow()
  })
})
