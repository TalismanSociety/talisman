import { beforeEach, describe, expect, it, vi } from "vitest"

// --- Mocks ---

const mockSleep = vi.fn()
vi.mock("@talismn/util", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@talismn/util")>()),
  sleep: (...args: unknown[]) => mockSleep(...args),
}))

vi.mock("../app/store.remoteConfig", () => ({
  remoteConfigStore: { get: vi.fn() },
}))

const mockFetchForevermoneyStatus = vi.fn()
vi.mock("../forevermoney/deliveryStatus", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../forevermoney/deliveryStatus")>()),
  fetchForevermoneyStatus: (...args: unknown[]) => mockFetchForevermoneyStatus(...args),
}))

import { db } from "../../db"
import type { WalletTransactionEth } from "./types"
import { watchSwapStatus } from "./watchSwapStatus"

// --- Helpers ---

const HASH = "0xabc"

const insertTransfer = (overrides: Partial<WalletTransactionEth> = {}) =>
  db.transactionsV2.put({
    id: HASH,
    platform: "ethereum",
    networkId: "964",
    account: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    status: "success",
    confirmed: false,
    payload: {},
    hash: HASH,
    nonce: 1,
    timestamp: Date.now(),
    txInfo: {
      type: "swap-bittensor-evm",
      fromTokenId: "964:evm-native",
      toTokenId: "bittensor:substrate-native",
      fromAmount: "1000000000000000000",
      toAmount: "1000000000",
      to: "5GW7UHZ9tLocJUaMXFWkr48QHgVoq5tVR1az62mknFacM3cu",
    },
    ...overrides,
  })

const insertBridge = (overrides: Partial<WalletTransactionEth> = {}) =>
  insertTransfer({
    networkId: "8453",
    txInfo: {
      type: "swap-forevermoney",
      fromTokenId: "8453:evm-erc20:0xf3081494b87e8d5fb7960f066e931d1d0e6e3d67",
      toTokenId: "bittensor:substrate-native",
      fromAmount: "1000000000000000000",
      toAmount: "1000000000",
      to: "5GW7UHZ9tLocJUaMXFWkr48QHgVoq5tVR1az62mknFacM3cu",
      destinationStartBlock: "900",
    },
    ...overrides,
  })

const getSwapStatus = async () => (await db.transactionsV2.get(HASH))?.swapStatus

describe("watchSwapStatus bittensor-evm", () => {
  beforeEach(async () => {
    await db.transactionsV2.clear()
    vi.clearAllMocks()
    mockSleep.mockResolvedValue(undefined)
  })

  it("finishes once the transfer is confirmed", async () => {
    await insertTransfer({ confirmed: true })

    await watchSwapStatus(HASH)

    expect(await getSwapStatus()).toBe("finished")
    expect(mockSleep).not.toHaveBeenCalled()
  })

  it("keeps confirming until the confirmation lands", async () => {
    await insertTransfer()
    mockSleep.mockImplementationOnce(async () => {
      expect(await getSwapStatus()).toBe("confirming")
      await db.transactionsV2.update(HASH, { confirmed: true })
    })

    await watchSwapStatus(HASH)

    expect(await getSwapStatus()).toBe("finished")
    expect(mockSleep).toHaveBeenCalledTimes(1)
  })

  it("fails when the confirmation reverts the transfer", async () => {
    await insertTransfer()
    mockSleep.mockImplementationOnce(async () => {
      await db.transactionsV2.update(HASH, { status: "error", confirmed: true })
    })

    await watchSwapStatus(HASH)

    expect(await getSwapStatus()).toBe("failed")
  })

  it("lets an old unconfirmed success stand", async () => {
    await insertTransfer({ timestamp: Date.now() - 11 * 60 * 1_000 })

    await watchSwapStatus(HASH)

    expect(await getSwapStatus()).toBe("finished")
    expect(mockSleep).not.toHaveBeenCalled()
  })
})

describe("watchSwapStatus forevermoney", () => {
  beforeEach(async () => {
    await db.transactionsV2.clear()
    vi.clearAllMocks()
    mockSleep.mockResolvedValue(undefined)
  })

  it("keeps polling a failed delivery until it is retried", async () => {
    await insertBridge()
    mockFetchForevermoneyStatus.mockResolvedValueOnce("failed").mockResolvedValueOnce("finished")
    mockSleep.mockImplementationOnce(async () => {
      expect(await getSwapStatus()).toBe("failed")
    })

    await watchSwapStatus(HASH)

    expect(await getSwapStatus()).toBe("finished")
    expect(mockSleep).toHaveBeenCalledTimes(1)
  })

  it("stops on a failed delivery once the delivery window closed", async () => {
    await insertBridge({ timestamp: Date.now() - 25 * 60 * 60 * 1_000 })
    mockFetchForevermoneyStatus.mockResolvedValue("failed")

    await watchSwapStatus(HASH)

    expect(await getSwapStatus()).toBe("failed")
    expect(mockSleep).not.toHaveBeenCalled()
  })

  it("does not restart a watcher for a failed delivery past the window", async () => {
    await insertBridge({ timestamp: Date.now() - 25 * 60 * 60 * 1_000, swapStatus: "failed" })

    await watchSwapStatus(HASH)

    expect(mockFetchForevermoneyStatus).not.toHaveBeenCalled()
  })

  it("keeps polling an unknown delivery inside the window", async () => {
    await insertBridge({ timestamp: Date.now() - 2 * 60 * 60 * 1_000 })
    mockFetchForevermoneyStatus.mockResolvedValueOnce("unknown").mockResolvedValueOnce("finished")
    mockSleep.mockImplementationOnce(async () => {
      expect(await getSwapStatus()).toBe("unknown")
    })

    await watchSwapStatus(HASH)

    expect(await getSwapStatus()).toBe("finished")
    expect(mockSleep).toHaveBeenCalledTimes(1)
  })

  it("keeps polling a recent delivery after the status fetch keeps failing", async () => {
    await insertBridge()
    mockFetchForevermoneyStatus.mockRejectedValue(new Error("rpc down"))
    mockSleep.mockImplementation(async (ms: number) => {
      if (ms !== 20_000) return
      expect(await getSwapStatus()).toBe("unknown")
      mockFetchForevermoneyStatus.mockResolvedValue("finished")
    })

    await watchSwapStatus(HASH)

    expect(await getSwapStatus()).toBe("finished")
  })

  it("stops on an unknown delivery once the delivery window closed", async () => {
    await insertBridge({ timestamp: Date.now() - 25 * 60 * 60 * 1_000 })
    mockFetchForevermoneyStatus.mockResolvedValue("unknown")

    await watchSwapStatus(HASH)

    expect(await getSwapStatus()).toBe("unknown")
    expect(mockSleep).not.toHaveBeenCalled()
  })

  it("resumes a watcher for an unknown delivery inside the window", async () => {
    await insertBridge({ timestamp: Date.now() - 2 * 60 * 60 * 1_000, swapStatus: "unknown" })
    mockFetchForevermoneyStatus.mockResolvedValue("finished")

    await watchSwapStatus(HASH)

    expect(await getSwapStatus()).toBe("finished")
  })

  it("does not restart a watcher for an unknown delivery past the window", async () => {
    await insertBridge({ timestamp: Date.now() - 25 * 60 * 60 * 1_000, swapStatus: "unknown" })

    await watchSwapStatus(HASH)

    expect(mockFetchForevermoneyStatus).not.toHaveBeenCalled()
  })

  it("resumes a watcher for a recently failed delivery", async () => {
    await insertBridge({ swapStatus: "failed" })
    mockFetchForevermoneyStatus.mockResolvedValue("finished")

    await watchSwapStatus(HASH)

    expect(await getSwapStatus()).toBe("finished")
  })
})
