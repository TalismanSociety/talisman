import type { SwapEnv } from "@core/domains/swaps/env"
import { lifiLegRuntime } from "@core/domains/swaps/modules/lifi"
import type { QuoteLeg, SentLeg } from "@core/domains/swaps/types"
import { encodeEventTopics, erc20Abi, type Hex, type PublicClient, toHex } from "viem"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const ALICE = "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A"
const BOB = "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a"
const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7"
const SKYAI = "0x92aa03137385F18539301349dcfC9EbC923fFb10"
const TRUMP = "0x4EA98c1999575aaadfb38237Dd015c5E773F75a2"
const SOURCE_HASH: Hex = `0x${"aa".repeat(32)}`
const RECEIVING_HASH: Hex = `0x${"bb".repeat(32)}`
const FINALISED = 1_000n

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
  data: { steps: [{ tool: "lifiIntents" }] },
}

const SWAP_LEG: QuoteLeg = {
  ...BRIDGE_LEG,
  fromTokenId: `56:evm-erc20:${SKYAI.toLowerCase()}`,
  toTokenId: `56:evm-erc20:${TRUMP.toLowerCase()}`,
  recipient: BOB,
  data: { steps: [{ tool: "fly" }] },
}

const SENT: SentLeg = {
  hash: SOURCE_HASH,
  nonce: 5,
  sentAt: 0,
  evidence: { platform: "ethereum" },
  row: null,
}

const transfer = (token: Hex, from: Hex, to: Hex, value: bigint) => ({
  address: token,
  topics: encodeEventTopics({ abi: erc20Abi, eventName: "Transfer", args: { from, to } }),
  data: toHex(value, { size: 32 }),
})

const receipt = (
  logs: ReturnType<typeof transfer>[],
  { status = "success", blockNumber = FINALISED }: { status?: string; blockNumber?: bigint } = {}
) => ({ status, blockNumber, logs })

const receipts = new Map<string, ReturnType<typeof receipt>>()

const evmClient = (networkId: string) =>
  ({
    getBlock: async () => ({ number: FINALISED }),
    getTransactionCount: async () => 6,
    getTransaction: async () => ({ input: "0x", value: 0n }),
    getTransactionReceipt: async ({ hash }: { hash: Hex }) => {
      const found = receipts.get(`${networkId}:${hash}`)
      if (!found)
        throw Object.assign(new Error("not found"), { name: "TransactionReceiptNotFoundError" })
      return found
    },
  }) as unknown as PublicClient

const fetchMock = vi.fn<typeof fetch>()

const env = {
  evmClient: async (networkId: string) => evmClient(networkId),
  proxyFetch: fetchMock,
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

const observe = (leg: QuoteLeg, handsOver = true) =>
  lifiLegRuntime.observeLeg({ leg, sent: SENT, handsOver }, env)

beforeEach(() => {
  receipts.clear()
})

afterEach(() => {
  fetchMock.mockReset()
})

describe("lifiLegRuntime.observeLeg", () => {
  it("never signs in the background", async () => {
    expect(
      await lifiLegRuntime.boundLeg({ leg: SWAP_LEG, slippage: 0.005, maxSpend: 0n }, env)
    ).toBeNull()
  })

  it("lands a same-chain step with the net amount the recipient received in the source receipt", async () => {
    receipts.set(
      `56:${SOURCE_HASH}`,
      receipt([
        transfer(SKYAI, ALICE, BOB, 1_000n),
        transfer(TRUMP, BOB, ALICE, 5n),
        transfer(TRUMP, ALICE, BOB, 905n),
      ])
    )
    expect(await observe(SWAP_LEG)).toEqual({ status: "landed", hash: SOURCE_HASH, amount: 900n })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("lands a bridge step on the finalised receiving receipt /status points at", async () => {
    receipts.set(`1:${SOURCE_HASH}`, receipt([]))
    receipts.set(`56:${RECEIVING_HASH}`, receipt([transfer(SKYAI, BOB, ALICE, 880n)]))
    status(delivered())

    expect(await observe(BRIDGE_LEG)).toEqual({ status: "landed", hash: SOURCE_HASH, amount: 880n })
    const url = new URL(String(fetchMock.mock.calls[0][0]))
    expect(url.pathname).toBe("/v1/status")
    expect(Object.fromEntries(url.searchParams)).toEqual({
      txHash: SOURCE_HASH,
      fromChain: "1",
      toChain: "56",
      bridge: "lifiIntents",
    })
  })

  it("keeps a bridge step pending while LI.FI still works on it", async () => {
    receipts.set(`1:${SOURCE_HASH}`, receipt([]))
    status({ status: "PENDING", substatus: "WAIT_DESTINATION_TRANSACTION" })
    expect(await observe(BRIDGE_LEG)).toEqual({ status: "pending" })

    status({ message: "Transaction hash is not found in any chain.", code: 1003 }, 404)
    expect(await observe(BRIDGE_LEG)).toEqual({ status: "pending" })
  })

  it("is indeterminate when the bridge refunded", async () => {
    receipts.set(`1:${SOURCE_HASH}`, receipt([]))
    status(delivered({ substatus: "REFUNDED" }))
    expect(await observe(BRIDGE_LEG)).toEqual({ status: "failed", reason: "indeterminate" })
  })

  it.each([
    ["chain", { receiving: { txHash: RECEIVING_HASH, chainId: 8453, token: { address: SKYAI } } }],
    ["token", { receiving: { txHash: RECEIVING_HASH, chainId: 56, token: { address: TRUMP } } }],
    ["recipient", { toAddress: BOB }],
  ])("is indeterminate when the delivery %s is not the leg's", async (_, overrides) => {
    receipts.set(`1:${SOURCE_HASH}`, receipt([]))
    receipts.set(`56:${RECEIVING_HASH}`, receipt([transfer(SKYAI, BOB, ALICE, 880n)]))
    status(delivered(overrides))
    expect(await observe(BRIDGE_LEG)).toEqual({ status: "failed", reason: "indeterminate" })
  })

  it("waits for the receiving receipt to finalise", async () => {
    receipts.set(`1:${SOURCE_HASH}`, receipt([]))
    receipts.set(
      `56:${RECEIVING_HASH}`,
      receipt([transfer(SKYAI, BOB, ALICE, 880n)], { blockNumber: FINALISED + 1n })
    )
    status(delivered())
    expect(await observe(BRIDGE_LEG)).toEqual({ status: "pending" })

    status(delivered())
    expect(await observe(BRIDGE_LEG)).toEqual({ status: "pending" })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("is indeterminate when nothing reached the recipient", async () => {
    receipts.set(`1:${SOURCE_HASH}`, receipt([]))
    receipts.set(`56:${RECEIVING_HASH}`, receipt([transfer(SKYAI, BOB, BOB, 880n)]))
    status(delivered())
    expect(await observe(BRIDGE_LEG)).toEqual({ status: "failed", reason: "indeterminate" })
  })

  it("lands the last leg with the quoted output and asks LI.FI nothing", async () => {
    receipts.set(`1:${SOURCE_HASH}`, receipt([]))
    expect(await observe(BRIDGE_LEG, false)).toEqual({
      status: "landed",
      hash: SOURCE_HASH,
      amount: 950n,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("reports the source transaction's own fate before looking at the delivery", async () => {
    receipts.set(`1:${SOURCE_HASH}`, receipt([], { status: "reverted" }))
    expect(await observe(BRIDGE_LEG)).toEqual({
      status: "failed",
      reason: "reverted",
      hash: SOURCE_HASH,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
