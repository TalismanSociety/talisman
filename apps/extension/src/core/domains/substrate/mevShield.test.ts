import type { SubscriptionCallback } from "@talismn/chain-connectors"
import type { DotNetwork } from "@talismn/chaindata-provider"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { SignerPayloadJSON } from "../../types/pjsInterop"
import { getHeaderInfo, type JsonHeader } from "../transactions/watchSubstrateTransaction"

const { send, subscribe, unsubscribe, assemble, encrypt, watch } = vi.hoisted(() => ({
  send: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  assemble: vi.fn(),
  encrypt: vi.fn(),
  watch: vi.fn(),
}))

vi.mock("../../rpcs/chain-connector-dot", () => ({ chainConnectorDot: { send, subscribe } }))
vi.mock("../metadata/getMetadataDef", () => ({ getMetadataDef: async () => ({}) }))
vi.mock("../metadata/helpers", () => ({ getMetadataRpcFromDef: () => "0x6d657461" }))
vi.mock("../signing/signSubstratePayload", () => ({ assembleSubstrateTransaction: assemble }))
vi.mock("../transactions/watchSubstrateTransaction", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../transactions/watchSubstrateTransaction")>()),
  watchSubstrateTransaction: watch,
}))
vi.mock("@talismn/crypto", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@talismn/crypto")>()),
  encryptKemAead: encrypt,
}))
vi.mock("@talismn/scale", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@talismn/scale")>()),
  parseMetadataRpc: () => ({
    unifiedMetadata: {
      pallets: [{ name: "Timestamp", constants: [{ name: "MinimumPeriod", value: "0x7017" }] }],
    },
    builder: {
      buildStorage: () => ({
        keys: { enc: () => "0x4e6578744b6579" },
        value: { dec: () => new Uint8Array(32).fill(7) },
      }),
      buildConstant: () => ({ dec: () => 6_000n }),
      buildCall: () => ({ location: [30, 1], codec: { enc: () => new Uint8Array([9, 9]) } }),
    },
  }),
}))

import { broadcastMevShieldInWindow, createMevShieldSeal, waitForNextHead } from "./mevShield"

const header = (number: number): JsonHeader => ({
  parentHash: `0x${(number - 1).toString(16).padStart(64, "0")}`,
  number: `0x${number.toString(16)}`,
  stateRoot: `0x${"11".repeat(32)}`,
  extrinsicsRoot: `0x${"22".repeat(32)}`,
  digest: { logs: [] },
})

const payload: SignerPayloadJSON = {
  address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  blockHash: "0x1234",
  blockNumber: "0x00000064",
  era: "0x5500",
  genesisHash: "0x2f0555cc76fc2840a25a6ea3b9637146806f1f44b090c175ffde2a7e5ab36c03",
  method: "0x0700",
  nonce: "0x0000000f",
  specVersion: "0x000001df",
  tip: "0x00000000000000000000000000000000",
  transactionVersion: "0x00000001",
  signedExtensions: ["CheckNonce", "CheckMetadataHash"],
  version: 4,
  mode: 1,
  metadataHash: "0xabcd",
  withSignedTransaction: true,
}

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe("waitForNextHead", () => {
  let emit: SubscriptionCallback

  beforeEach(() => {
    send.mockRejectedValue(new Error("no rpc expected"))
    subscribe.mockImplementation(async (...args: unknown[]) => {
      emit = args[4] as SubscriptionCallback
      return unsubscribe
    })
  })

  it("takes the replayed head as the baseline, even when it is newer than any before", async () => {
    const head = waitForNextHead("bittensor")
    await vi.waitFor(() => expect(subscribe).toHaveBeenCalled())

    emit(null, header(101))
    emit(null, header(101))
    vi.spyOn(Date, "now").mockReturnValue(42_000)
    emit(null, header(102))

    const { hash } = (await getHeaderInfo("bittensor", header(102))) ?? {}
    await expect(head).resolves.toEqual({
      number: 102,
      hash,
      parentHash: header(102).parentHash,
      seenAt: 42_000,
    })
    expect(send).not.toHaveBeenCalled()
    expect(subscribe.mock.calls[0]?.slice(0, 3)).toEqual([
      "bittensor",
      "chain_subscribeNewHeads",
      "chain_newHead",
    ])
    expect(unsubscribe).toHaveBeenCalledWith("chain_unsubscribeNewHeads")
  })

  it("rejects on a header it cannot read, instead of waiting for the timeout", async () => {
    const head = waitForNextHead("bittensor")
    await vi.waitFor(() => expect(subscribe).toHaveBeenCalled())

    emit(null, header(100))
    emit(null, { ...header(101), number: "0xzz" })

    await expect(head).rejects.toThrow("Invalid block header")
    expect(unsubscribe).toHaveBeenCalledWith("chain_unsubscribeNewHeads")
  })

  it("gives up after the timeout and unsubscribes", async () => {
    vi.useFakeTimers()
    const head = waitForNextHead("bittensor", 1_000)
    const rejected = expect(head).rejects.toThrow("Timed out waiting for the next block")
    await vi.waitFor(() => expect(subscribe).toHaveBeenCalled())

    emit(null, header(100))
    await vi.advanceTimersByTimeAsync(1_000)

    await rejected
    expect(unsubscribe).toHaveBeenCalledWith("chain_unsubscribeNewHeads")
  })

  it("rejects when the subscription reports an error", async () => {
    const head = waitForNextHead("bittensor")
    await vi.waitFor(() => expect(subscribe).toHaveBeenCalled())

    emit(new Error("socket closed"), null)

    await expect(head).rejects.toThrow("socket closed")
    expect(unsubscribe).toHaveBeenCalledWith("chain_unsubscribeNewHeads")
  })
})

describe("createMevShieldSeal", () => {
  const head = { number: 1005, hash: "0xhead", parentHash: "0xparent" } as const

  beforeEach(() => {
    assemble.mockResolvedValue({ hash: "0xinner", signedTransactionBytes: new Uint8Array([1]) })
    encrypt.mockResolvedValue(new Uint8Array([2]))
    send.mockImplementation(async (_chainId: string, method: string, params: unknown[]) => {
      if (method !== "state_getStorage") throw new Error(method)
      return params[1] === "0xhead" ? "0x07" : null
    })
  })

  it("encrypts the inner transaction signed at the next nonce", async () => {
    const { sealAt } = await createMevShieldSeal("bittensor", payload, "0xsig")
    await sealAt(head)

    expect(assemble).toHaveBeenCalledWith({ ...payload, nonce: "0x10" }, "0xsig")
    expect(encrypt).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      new Uint8Array(32).fill(7),
      new Uint8Array([1])
    )
  })

  it("births the submit_encrypted at the parent of head N, with an 8 block era", async () => {
    const { sealAt } = await createMevShieldSeal("bittensor", payload, "0xsig")

    expect(await sealAt(head)).toEqual({
      ...payload,
      method: "0x1e010909",
      era: "0x4200",
      blockNumber: "0x000003ec",
      blockHash: "0xparent",
    })
  })

  it("reads the key at the head it was given", async () => {
    const { sealAt } = await createMevShieldSeal("bittensor", payload, "0xsig")

    expect(await sealAt({ ...head, hash: "0xother" })).toBeNull()
    expect(send.mock.calls.map(([, , params]) => params)).toEqual([["0x4e6578744b6579", "0xother"]])
  })

  it("takes the block time from Timestamp.MinimumPeriod", async () => {
    expect((await createMevShieldSeal("bittensor", payload, "0xsig")).blockTimeMs).toBe(12_000)
  })
})

describe("broadcastMevShieldInWindow", () => {
  const chain = { id: "bittensor" } as DotNetwork
  const outerPayload = { ...payload, method: "0x1e01" }
  const signed = {
    inner: { payload: { ...payload, nonce: "0x10" }, signature: "0x01" },
    outer: { payload: outerPayload, signature: "0x02" },
  } as const
  const shieldWindow = { headNumber: 1000, deadline: 50_000 }

  const sendOrder = (method: string) =>
    send.mock.invocationCallOrder[send.mock.calls.findIndex(([, called]) => called === method)]

  beforeEach(() => {
    assemble.mockImplementation(async (signedPayload: SignerPayloadJSON) =>
      signedPayload === outerPayload
        ? { hash: "0xouter", signedTransaction: "0xoutertx" }
        : { hash: "0xinner", signedTransaction: "0xinnertx" }
    )
    send.mockImplementation(async (_chainId: string, method: string) => {
      if (method === "chain_getHeader") return header(1001)
      if (method === "author_submitExtrinsic") return "0xouter"
      throw new Error(method)
    })
    vi.spyOn(Date, "now").mockReturnValue(49_999)
  })

  it("checks the window once both are assembled, broadcasts right after, then watches both", async () => {
    let assembling = 0
    const assembleNow = assemble.getMockImplementation()
    assemble.mockImplementation(async (signedPayload: SignerPayloadJSON) => {
      assembling++
      await new Promise((resolve) => setTimeout(resolve))
      assembling--
      return assembleNow?.(signedPayload)
    })
    const sendNow = send.getMockImplementation()
    const assemblingAtHeadRead: number[] = []
    send.mockImplementation(async (chainId: string, method: string, params: unknown[]) => {
      if (method === "chain_getHeader") assemblingAtHeadRead.push(assembling)
      return sendNow?.(chainId, method, params)
    })

    expect(await broadcastMevShieldInWindow(chain, signed, shieldWindow)).toEqual({
      status: "submitted",
      hash: "0xouter",
      innerHash: "0xinner",
    })

    expect(send.mock.calls.map(([, method, params]) => [method, params])).toEqual([
      ["chain_getHeader", []],
      ["author_submitExtrinsic", ["0xoutertx"]],
    ])
    expect(assemblingAtHeadRead).toEqual([0])
    const submittedAt = sendOrder("author_submitExtrinsic") ?? Number.POSITIVE_INFINITY
    expect(Math.min(...watch.mock.invocationCallOrder)).toBeGreaterThan(submittedAt)
    expect(watch).toHaveBeenCalledWith(chain, outerPayload, "0x02")
    expect(watch).toHaveBeenCalledWith(chain, signed.inner.payload, "0x01", { txInfo: undefined })
  })

  it("sends nothing once the deadline has passed", async () => {
    vi.spyOn(Date, "now").mockReturnValue(50_000)

    expect(await broadcastMevShieldInWindow(chain, signed, shieldWindow)).toEqual({
      status: "missed",
    })
    expect(sendOrder("author_submitExtrinsic")).toBeUndefined()
    expect(watch).not.toHaveBeenCalled()
  })

  it("sends nothing once block N + 2 exists", async () => {
    send.mockImplementation(async (_chainId: string, method: string) => {
      if (method === "chain_getHeader") return header(1002)
      throw new Error(method)
    })

    expect(await broadcastMevShieldInWindow(chain, signed, shieldWindow)).toEqual({
      status: "missed",
    })
    expect(watch).not.toHaveBeenCalled()
  })

  it("reports a broadcast wrapper as submitted when watching it fails", async () => {
    watch.mockRejectedValueOnce(new Error("db closed"))

    expect(await broadcastMevShieldInWindow(chain, signed, shieldWindow)).toEqual({
      status: "submitted",
      hash: "0xouter",
      innerHash: "0xinner",
    })
  })

  it("watches nothing when the node rejects the wrapper", async () => {
    send.mockImplementation(async (_chainId: string, method: string) => {
      if (method === "chain_getHeader") return header(1001)
      throw new Error("1010: Invalid Transaction")
    })

    await expect(broadcastMevShieldInWindow(chain, signed, shieldWindow)).rejects.toThrow(
      "Invalid Transaction"
    )
    expect(watch).not.toHaveBeenCalled()
  })
})
