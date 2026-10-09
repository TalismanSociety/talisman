import type { PolkadotClient } from "polkadot-api"
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest"

import { StaleRpcError } from "./ChainConnectorDot"
import { ChainConnectorDotPapi, type PapiClient } from "./ChainConnectorDotPapi"

type Changes = [`0x${string}`, `0x${string}` | null][]

const createFakeClient = () => {
  const observers = new Set<{ next: (blocks: { hash: string }[]) => void }>()
  const pending = new Map<string, (changes: Changes | Error) => void>()
  const requests: { method: string; params: unknown[] }[] = []

  const client: PapiClient = {
    _request: <Reply>(method: string, params: unknown[], abortSignal?: AbortSignal) => {
      requests.push({ method, params })
      if (method === "system_health") return Promise.resolve("system_health result" as Reply)

      const blockHash = params[1] as `0x${string}`
      return new Promise<Reply>((resolve, reject) => {
        abortSignal?.addEventListener("abort", () => reject(new Error("Aborted")))
        pending.set(blockHash, (changes) =>
          changes instanceof Error
            ? reject(changes)
            : resolve([{ block: blockHash, changes }] as Reply)
        )
      })
    },
    bestBlocks$: {
      subscribe: (observer) => {
        observers.add(observer)
        return { unsubscribe: () => observers.delete(observer) }
      },
    },
  }

  const newBestBlock = (hash: string) => {
    for (const observer of observers) observer.next([{ hash }])
  }
  const answer = async (hash: string, changes: Changes | Error) => {
    pending.get(hash)?.(changes)
    await vi.advanceTimersByTimeAsync(0)
  }
  const queriedBlocks = () =>
    requests
      .filter(({ method }) => method === "state_queryStorageAt")
      .map(({ params }) => params[1])

  return { client, observers, newBestBlock, answer, queriedBlocks }
}

const subscribeStorage = (fake: ReturnType<typeof createFakeClient>, timeout?: number | false) => {
  const callback = vi.fn()
  const unsubscribe = new ChainConnectorDotPapi(() => fake.client).subscribe(
    "polkadot",
    "state_subscribeStorage",
    "state_storage",
    [["0xa", "0xb"]],
    callback,
    timeout
  )
  return { callback, unsubscribe }
}

const failure = new Error("State already discarded")

describe("ChainConnectorDotPapi", () => {
  vi.useFakeTimers()
  afterEach(() => {
    vi.clearAllTimers()
  })

  it("accepts a polkadot-api client", () => {
    expectTypeOf<PolkadotClient>().toExtend<PapiClient>()
  })

  it("sends requests through the network's client", async () => {
    const fake = createFakeClient()
    const connector = new ChainConnectorDotPapi((networkId) =>
      networkId === "polkadot" ? fake.client : undefined
    )

    await expect(connector.send("polkadot", "system_health", [])).resolves.toBe(
      "system_health result"
    )
    await expect(connector.send("kusama", "system_health", [])).rejects.toThrow(
      "No polkadot-api client for network kusama"
    )
  })

  it("aborts a request that gets no answer", async () => {
    const fake = createFakeClient()
    const sent = new ChainConnectorDotPapi(() => fake.client).send("polkadot", "never_answered", [])
    const rejection = expect(sent).rejects.toThrow("Aborted")

    await vi.advanceTimersByTimeAsync(30_000)
    await rejection
  })

  it("reports every key at the first best block, then only the keys that change", async () => {
    const fake = createFakeClient()
    const { callback } = subscribeStorage(fake)

    fake.newBestBlock("0x1")
    await fake.answer("0x1", [
      ["0xa", "0x01"],
      ["0xb", null],
    ])
    fake.newBestBlock("0x2")
    await fake.answer("0x2", [
      ["0xa", "0x01"],
      ["0xb", null],
    ])
    fake.newBestBlock("0x3")
    await fake.answer("0x3", [
      ["0xa", "0x02"],
      ["0xb", null],
    ])

    expect(callback.mock.calls).toEqual([
      [
        null,
        {
          block: "0x1",
          changes: [
            ["0xa", "0x01"],
            ["0xb", null],
          ],
        },
      ],
      [null, { block: "0x3", changes: [["0xa", "0x02"]] }],
    ])
  })

  it("queries each best block once, although finality re-emits it", async () => {
    const fake = createFakeClient()
    subscribeStorage(fake)

    fake.newBestBlock("0x1")
    fake.newBestBlock("0x1")
    await fake.answer("0x1", [["0xa", "0x01"]])
    fake.newBestBlock("0x1")

    expect(fake.queriedBlocks()).toEqual(["0x1"])
  })

  it("runs one query at a time, for the latest best block", async () => {
    const fake = createFakeClient()
    const { callback } = subscribeStorage(fake)

    fake.newBestBlock("0x1")
    fake.newBestBlock("0x2")
    fake.newBestBlock("0x3")
    expect(fake.queriedBlocks()).toEqual(["0x1"])

    await fake.answer("0x1", [["0xa", "0x01"]])
    expect(fake.queriedBlocks()).toEqual(["0x1", "0x3"])

    await fake.answer("0x3", [["0xa", "0x03"]])
    expect(callback.mock.calls).toEqual([
      [null, { block: "0x1", changes: [["0xa", "0x01"]] }],
      [null, { block: "0x3", changes: [["0xa", "0x03"]] }],
    ])
  })

  it("retries at the next block after a query fails or gets no answer", async () => {
    const fake = createFakeClient()
    const { callback } = subscribeStorage(fake, false)

    fake.newBestBlock("0x1")
    await fake.answer("0x1", [["0xa", "0x01"]])
    fake.newBestBlock("0x2")
    await fake.answer("0x2", failure)
    fake.newBestBlock("0x3")
    await vi.advanceTimersByTimeAsync(120_000)
    fake.newBestBlock("0x4")
    await fake.answer("0x4", [["0xa", "0x04"]])

    expect(fake.queriedBlocks()).toEqual(["0x1", "0x2", "0x3", "0x4"])
    expect(callback.mock.calls).toEqual([
      [null, { block: "0x1", changes: [["0xa", "0x01"]] }],
      [null, { block: "0x4", changes: [["0xa", "0x04"]] }],
    ])
  })

  it("reports the error when the first queries keep failing", async () => {
    const fake = createFakeClient()
    const { callback } = subscribeStorage(fake, false)

    for (const block of ["0x1", "0x2", "0x3"]) {
      fake.newBestBlock(block)
      await fake.answer(block, failure)
    }

    expect(callback.mock.calls).toEqual([[failure, null]])
    expect(fake.observers.size).toBe(0)
  })

  it("stops following blocks and drops pending answers once unsubscribed", async () => {
    const fake = createFakeClient()
    const { callback, unsubscribe } = subscribeStorage(fake)

    fake.newBestBlock("0x1")
    ;(await unsubscribe)("state_unsubscribeStorage")
    await fake.answer("0x1", [["0xa", "0x01"]])

    expect(fake.observers.size).toBe(0)
    expect(callback).not.toHaveBeenCalled()
  })

  it("reports a stale rpc when the first answer takes longer than the timeout", async () => {
    const fake = createFakeClient()
    const { callback } = subscribeStorage(fake, 1_000)
    await vi.advanceTimersByTimeAsync(1_000)

    expect(callback).toHaveBeenCalledWith(expect.any(StaleRpcError), null)
  })

  it("rejects subscriptions other than state_subscribeStorage", async () => {
    const fake = createFakeClient()
    const connector = new ChainConnectorDotPapi(() => fake.client)

    await expect(
      connector.subscribe("polkadot", "chain_subscribeNewHeads", "chain_newHead", [], () => {})
    ).rejects.toThrow("ChainConnectorDotPapi does not support chain_subscribeNewHeads")
  })
})
