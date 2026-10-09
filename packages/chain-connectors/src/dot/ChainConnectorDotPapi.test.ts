import { afterEach, describe, expect, it, vi } from "vitest"

import { StaleRpcError } from "./ChainConnectorDot"
import { ChainConnectorDotPapi, type PapiClient } from "./ChainConnectorDotPapi"

type Changes = [`0x${string}`, `0x${string}` | null][]

const createFakeClient = () => {
  const observers = new Set<{ next: (blocks: { hash: string }[]) => void }>()
  const pending = new Map<string, (changes: Changes | Error) => void>()
  const requests: { method: string; params: unknown[] }[] = []

  const client: PapiClient = {
    _request: <Reply>(method: string, params: unknown[]) => {
      requests.push({ method, params })
      if (method !== "state_queryStorageAt") return Promise.resolve(`${method} result` as Reply)
      const blockHash = params[1] as `0x${string}`
      return new Promise<Reply>((resolve, reject) =>
        pending.set(blockHash, (changes) =>
          changes instanceof Error
            ? reject(changes)
            : resolve([{ block: blockHash, changes }] as Reply)
        )
      )
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
    await vi.waitFor(() => Promise.resolve())
  }

  return { client, requests, observers, newBestBlock, answer }
}

const subscribeStorage = (
  connector: ChainConnectorDotPapi,
  keys: string[],
  timeout?: number | false
) => {
  const callback = vi.fn()
  const unsubscribe = connector.subscribe(
    "polkadot",
    "state_subscribeStorage",
    "state_storage",
    [keys],
    callback,
    timeout
  )
  return { callback, unsubscribe }
}

afterEach(() => {
  vi.useRealTimers()
})

describe("ChainConnectorDotPapi", () => {
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

  it("reports every key at the first best block, then only the keys that change", async () => {
    const fake = createFakeClient()
    const { callback } = subscribeStorage(new ChainConnectorDotPapi(() => fake.client), [
      "0xa",
      "0xb",
    ])
    await vi.waitFor(() => expect(fake.observers.size).toBe(1))

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

    expect(fake.requests).toContainEqual({
      method: "state_queryStorageAt",
      params: [["0xa", "0xb"], "0x1"],
    })
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

  it("reports the first block even when no keys are queried", async () => {
    const fake = createFakeClient()
    const { callback } = subscribeStorage(new ChainConnectorDotPapi(() => fake.client), [])
    await vi.waitFor(() => expect(fake.observers.size).toBe(1))

    fake.newBestBlock("0x1")
    await fake.answer("0x1", [])

    expect(callback.mock.calls).toEqual([[null, { block: "0x1", changes: [] }]])
  })

  it("ignores an answer that arrives after the answer for a newer block", async () => {
    const fake = createFakeClient()
    const { callback } = subscribeStorage(new ChainConnectorDotPapi(() => fake.client), ["0xa"])
    await vi.waitFor(() => expect(fake.observers.size).toBe(1))

    fake.newBestBlock("0x1")
    fake.newBestBlock("0x2")
    await fake.answer("0x2", [["0xa", "0x02"]])
    await fake.answer("0x1", [["0xa", "0x01"]])

    expect(callback.mock.calls).toEqual([[null, { block: "0x2", changes: [["0xa", "0x02"]] }]])
  })

  it("retries a failed query at the next block instead of ending the subscription", async () => {
    const fake = createFakeClient()
    const { callback } = subscribeStorage(new ChainConnectorDotPapi(() => fake.client), ["0xa"])
    await vi.waitFor(() => expect(fake.observers.size).toBe(1))

    fake.newBestBlock("0x1")
    await fake.answer("0x1", new Error("State already discarded"))
    fake.newBestBlock("0x2")
    await fake.answer("0x2", [["0xa", "0x02"]])

    expect(callback.mock.calls).toEqual([[null, { block: "0x2", changes: [["0xa", "0x02"]] }]])
  })

  it("stops following blocks and drops pending answers once unsubscribed", async () => {
    const fake = createFakeClient()
    const { callback, unsubscribe } = subscribeStorage(
      new ChainConnectorDotPapi(() => fake.client),
      ["0xa"]
    )
    await vi.waitFor(() => expect(fake.observers.size).toBe(1))

    fake.newBestBlock("0x1")
    ;(await unsubscribe)("state_unsubscribeStorage")
    await fake.answer("0x1", [["0xa", "0x01"]])

    expect(fake.observers.size).toBe(0)
    expect(callback).not.toHaveBeenCalled()
  })

  it("reports a stale rpc when no block arrives in time", async () => {
    vi.useFakeTimers()
    const fake = createFakeClient()
    const { callback } = subscribeStorage(
      new ChainConnectorDotPapi(() => fake.client),
      ["0xa"],
      1_000
    )
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
