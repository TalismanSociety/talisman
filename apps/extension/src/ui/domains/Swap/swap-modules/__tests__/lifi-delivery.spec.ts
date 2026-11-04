import { encodeEventTopics, erc20Abi, type Hex, type PublicClient, toHex } from "viem"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { LegOutcome, QuoteLeg, SettledTransaction, SwapEnv } from "../common.swap-module"
import { settleLifiLeg } from "../lifi-delivery"

const ALICE = "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A"
const BOB = "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a"
const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7"
const SKYAI = "0x92aa03137385F18539301349dcfC9EbC923fFb10"
const TRUMP = "0x4EA98c1999575aaadfb38237Dd015c5E773F75a2"
const SOURCE_HASH: Hex = `0x${"aa".repeat(32)}`
const RECEIVING_HASH: Hex = `0x${"bb".repeat(32)}`
const CONFIRMED = 1_000n

const BRIDGE_LEG: QuoteLeg = {
  protocol: "lifi",
  fromTokenId: `1:evm-erc20:${USDT.toLowerCase()}`,
  toTokenId: `56:evm-erc20:${SKYAI.toLowerCase()}`,
  signer: ALICE,
  recipient: ALICE,
  inputAmount: 10_000_000n,
  outputAmount: 950n,
  fees: [],
  timeInSec: 60,
}

const SWAP_LEG: QuoteLeg = {
  ...BRIDGE_LEG,
  fromTokenId: `56:evm-erc20:${SKYAI.toLowerCase()}`,
  toTokenId: `56:evm-erc20:${TRUMP.toLowerCase()}`,
  recipient: BOB,
}

const transfer = (token: Hex, from: Hex, to: Hex, value: bigint) => ({
  address: token,
  topics: encodeEventTopics({ abi: erc20Abi, eventName: "Transfer", args: { from, to } }),
  data: toHex(value, { size: 32 }),
})

const receipt = (
  logs: ReturnType<typeof transfer>[],
  { status = "success", blockNumber = CONFIRMED }: { status?: string; blockNumber?: bigint } = {}
) => ({ status, blockNumber, logs })

const receipts = new Map<string, ReturnType<typeof receipt>>()
let head = CONFIRMED + 1n

const evmClient = (networkId: string) =>
  ({
    getBlockNumber: async () => head,
    getTransactionReceipt: async ({ hash }: { hash: Hex }) => {
      const found = receipts.get(`${networkId}:${hash}`)
      if (!found)
        throw Object.assign(new Error("not found"), { name: "TransactionReceiptNotFoundError" })
      return found
    },
  }) as unknown as PublicClient

const fetchMock = vi.fn<typeof fetch>()
let source: SettledTransaction = { landed: true, hash: SOURCE_HASH }

const env = {
  evmClient: async (networkId: string) => evmClient(networkId),
  proxyFetch: fetchMock,
  waitForTransaction: async () => source,
} as unknown as SwapEnv

const status = (body: Record<string, unknown>, httpStatus = 200) =>
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status: httpStatus,
      headers: { "content-type": "application/json" },
    })
  )

const delivered = (overrides: Record<string, unknown> = {}) => ({
  status: "DONE",
  substatus: "COMPLETED",
  toAddress: ALICE,
  receiving: { txHash: RECEIVING_HASH, chainId: 56, token: { address: SKYAI }, amount: "900" },
  ...overrides,
})

const settle = (leg: QuoteLeg, signal = new AbortController().signal) =>
  settleLifiLeg({ leg, hash: SOURCE_HASH, input: leg.inputAmount }, env, signal)

const undelivered: LegOutcome = { landed: false, hash: SOURCE_HASH, stop: "undelivered" }

beforeEach(() => {
  vi.useFakeTimers()
  receipts.clear()
  head = CONFIRMED + 1n
  source = { landed: true, hash: SOURCE_HASH }
  fetchMock.mockResolvedValue(new Response("{}", { status: 503 }))
})

afterEach(() => {
  fetchMock.mockReset()
  vi.useRealTimers()
})

describe("settleLifiLeg", () => {
  it("lands a same-chain step with the net amount the recipient received in the source receipt", async () => {
    receipts.set(
      `56:${SOURCE_HASH}`,
      receipt([
        transfer(SKYAI, ALICE, BOB, 1_000n),
        transfer(TRUMP, BOB, ALICE, 5n),
        transfer(TRUMP, ALICE, BOB, 905n),
      ])
    )
    expect(await settle(SWAP_LEG)).toEqual({ landed: true, hash: SOURCE_HASH, amount: 900n })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("lands a bridge step on the confirmed receiving receipt /status points at", async () => {
    receipts.set(`56:${RECEIVING_HASH}`, receipt([transfer(SKYAI, BOB, ALICE, 880n)]))
    status(delivered())

    expect(await settle(BRIDGE_LEG)).toEqual({ landed: true, hash: SOURCE_HASH, amount: 880n })
    const url = new URL(String(fetchMock.mock.calls[0][0]))
    expect(url.pathname).toBe("/v1/status")
    expect(Object.fromEntries(url.searchParams)).toEqual({
      txHash: SOURCE_HASH,
      fromChain: "1",
      toChain: "56",
    })
  })

  it("keeps polling while LI.FI still works on it or cannot answer", async () => {
    receipts.set(`56:${RECEIVING_HASH}`, receipt([transfer(SKYAI, BOB, ALICE, 880n)]))
    status({ status: "PENDING", substatus: "WAIT_DESTINATION_TRANSACTION" })
    status({ message: "Transaction hash is not found in any chain.", code: 1003 }, 404)
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"))
    status(delivered())

    const settled = settle(BRIDGE_LEG)
    await vi.advanceTimersByTimeAsync(15_000)
    expect(await settled).toEqual({ landed: true, hash: SOURCE_HASH, amount: 880n })
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it("waits for a second block to confirm the receiving receipt", async () => {
    receipts.set(
      `56:${RECEIVING_HASH}`,
      receipt([transfer(SKYAI, BOB, ALICE, 880n)], { blockNumber: CONFIRMED + 1n })
    )
    fetchMock.mockImplementation(async () => new Response(JSON.stringify(delivered())))

    const settled = settle(BRIDGE_LEG)
    await vi.advanceTimersByTimeAsync(5_000)
    expect(fetchMock).toHaveBeenCalledTimes(2)

    head = CONFIRMED + 2n
    await vi.advanceTimersByTimeAsync(5_000)
    expect(await settled).toEqual({ landed: true, hash: SOURCE_HASH, amount: 880n })
  })

  it("is undelivered when the bridge refunded", async () => {
    status(delivered({ substatus: "REFUNDED" }))
    expect(await settle(BRIDGE_LEG)).toEqual(undelivered)
  })

  it.each([
    ["chain", { receiving: { txHash: RECEIVING_HASH, chainId: 8453, token: { address: SKYAI } } }],
    ["token", { receiving: { txHash: RECEIVING_HASH, chainId: 56, token: { address: TRUMP } } }],
    ["recipient", { toAddress: BOB }],
  ])("is undelivered when the delivery %s is not the leg's", async (_, overrides) => {
    receipts.set(`56:${RECEIVING_HASH}`, receipt([transfer(SKYAI, BOB, ALICE, 880n)]))
    status(delivered(overrides))
    expect(await settle(BRIDGE_LEG)).toEqual(undelivered)
  })

  it("is undelivered when nothing reached the recipient", async () => {
    receipts.set(`56:${RECEIVING_HASH}`, receipt([transfer(SKYAI, BOB, BOB, 880n)]))
    status(delivered())
    expect(await settle(BRIDGE_LEG)).toEqual(undelivered)
  })

  it("throws on a status it cannot read", async () => {
    status({ status: "DONE", substatus: "COMPLETED" })
    await expect(settle(BRIDGE_LEG)).rejects.toThrow("Unexpected LI.FI status response")
  })

  it("reports the source transaction's own fate before looking at the delivery", async () => {
    source = { landed: false, hash: SOURCE_HASH, stop: "failed" }
    expect(await settle(BRIDGE_LEG)).toEqual(source)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("stops polling once the screen closed", async () => {
    const controller = new AbortController()
    const settled = settle(BRIDGE_LEG, controller.signal)
    const rejected = expect(settled).rejects.toThrow()
    await vi.advanceTimersByTimeAsync(5_000)
    controller.abort()
    await rejected
    const calls = fetchMock.mock.calls.length
    await vi.advanceTimersByTimeAsync(20_000)
    expect(fetchMock).toHaveBeenCalledTimes(calls)
  })
})
