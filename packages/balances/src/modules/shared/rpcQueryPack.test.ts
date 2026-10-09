import type { IChainConnectorDot } from "@talismn/chain-connectors"
import { yieldToEventLoop } from "@talismn/util"
import { describe, expect, it, vi } from "vitest"

import { fetchRpcQueryPack, getRpcQueryPack$, type RpcQueryPack } from "./rpcQueryPack"

type StorageCallback = (error: unknown, result: unknown) => void

/** fake dot connector exposing the storage subscription callback for manual driving */
const makeFakeConnector = () => {
  let callback: StorageCallback | null = null
  const unsubscribe = vi.fn()

  const connector = {
    send: vi.fn(),
    subscribe: vi.fn(
      async (
        _networkId: string,
        _subscribeMethod: string,
        _responseMethod: string,
        _params: unknown[],
        cb: StorageCallback
      ) => {
        callback = cb
        return unsubscribe
      }
    ),
  } as unknown as IChainConnectorDot

  return {
    connector,
    unsubscribe,
    emitChanges: (changes: Array<[string, string]>, block = "0x00") => {
      if (!callback) throw new Error("no subscription callback captured")
      callback(null, { block, changes })
    },
  }
}

const makeQueries = (count: number, decoded: (i: number, value: string | null) => string) =>
  Array.from(
    { length: count },
    (_, i): RpcQueryPack<string> => ({
      stateKeys: [`0xkey${i}` as `0x${string}`],
      decodeResult: ([value]) => decoded(i, value),
    })
  )

const drainUntil = async (predicate: () => boolean, tries = 200) => {
  for (let i = 0; i < tries && !predicate(); i++) await yieldToEventLoop()
  expect(predicate()).toBe(true)
}

describe("getRpcQueryPack$", () => {
  it("decodes results for all queries (parity with the legacy sync path)", async () => {
    const { connector, emitChanges } = makeFakeConnector()
    const queries = makeQueries(3, (i, value) => `${i}:${value}`)

    const emissions: string[][] = []
    const sub = getRpcQueryPack$(connector, "polkadot", queries).subscribe((v) => emissions.push(v))

    await yieldToEventLoop() // let the subscription set up
    emitChanges([
      ["0xkey0", "0xaa"],
      ["0xkey2", "0xcc"],
    ])
    await drainUntil(() => emissions.length === 1)

    // key1 has no change: decodeResult receives null (same as legacy .find miss)
    expect(emissions[0]).toEqual(["0:0xaa", "1:null", "2:0xcc"])

    // later callbacks merge into the cached full set
    emitChanges([["0xkey1", "0xbb"]])
    await drainUntil(() => emissions.length === 2)
    expect(emissions[1]).toEqual(["0:0xaa", "1:0xbb", "2:0xcc"])

    sub.unsubscribe()
  })

  it("emits synchronously for empty state keys", async () => {
    const { connector } = makeFakeConnector()
    const queries: RpcQueryPack<string>[] = [
      { stateKeys: [null], decodeResult: ([value]) => `v:${value}` },
    ]

    const emissions: string[][] = []
    getRpcQueryPack$(connector, "polkadot", queries).subscribe((v) => emissions.push(v))
    expect(emissions).toEqual([["v:null"]])
  })

  it("coalesces decodes with latest-wins when a new block arrives mid-decode", async () => {
    const { connector, emitChanges } = makeFakeConnector()
    const queries = makeQueries(50, (i, value) => `${i}:${value}`)

    const emissions: string[][] = []
    const sub = getRpcQueryPack$(connector, "polkadot", queries).subscribe((v) => emissions.push(v))

    await yieldToEventLoop()
    // two callbacks in the same tick: block A's decode is superseded before it can finish
    emitChanges([["0xkey0", "0xaa"]])
    emitChanges([["0xkey0", "0xab"]])

    await drainUntil(() => emissions.length >= 1)
    await yieldToEventLoop()
    await yieldToEventLoop()

    // only the merged latest snapshot is emitted
    expect(emissions).toHaveLength(1)
    expect(emissions[0][0]).toBe("0:0xab")

    sub.unsubscribe()
  })

  it("unsubscribes from the rpc subscription and stops decoding on teardown", async () => {
    const { connector, unsubscribe, emitChanges } = makeFakeConnector()
    let decodes = 0
    const queries = makeQueries(10, (i, value) => {
      decodes++
      return `${i}:${value}`
    })

    const emissions: string[][] = []
    const sub = getRpcQueryPack$(connector, "polkadot", queries).subscribe((v) => emissions.push(v))

    await yieldToEventLoop()
    emitChanges([["0xkey0", "0xaa"]])
    sub.unsubscribe() // before the async decode gets to run

    const decodesAtUnsubscribe = decodes
    for (let i = 0; i < 5; i++) await yieldToEventLoop()

    expect(emissions).toEqual([])
    expect(decodes).toBe(decodesAtUnsubscribe)
    await drainUntil(() => unsubscribe.mock.calls.length === 1)
    expect(unsubscribe).toHaveBeenCalledWith("state_unsubscribeStorage")
  })

  it("errors the stream when the rpc reports an error", async () => {
    const { connector, emitChanges: _ } = makeFakeConnector()
    const queries = makeQueries(1, (i, value) => `${i}:${value}`)

    let error: unknown
    const sub = getRpcQueryPack$(connector, "polkadot", queries).subscribe({
      error: (e) => (error = e),
    })

    await yieldToEventLoop()
    const cb = (connector.subscribe as ReturnType<typeof vi.fn>).mock.calls[0][4] as StorageCallback
    cb(new Error("ws error"), null)

    expect(error).toEqual(new Error("ws error"))
    sub.unsubscribe()
  })
})

describe("fetchRpcQueryPack", () => {
  it("decodes a one-shot state_queryStorageAt result", async () => {
    const { connector } = makeFakeConnector()
    ;(connector.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { block: "0x00", changes: [["0xkey0", "0xaa"]] },
    ])

    const queries = makeQueries(2, (i, value) => `${i}:${value}`)
    expect(await fetchRpcQueryPack(connector, "polkadot", queries)).toEqual(["0:0xaa", "1:null"])
  })

  it("returns nulls without sending when there are no state keys", async () => {
    const { connector } = makeFakeConnector()
    const queries: RpcQueryPack<string>[] = [
      { stateKeys: [null, null], decodeResult: (values) => values.join(",") },
    ]

    expect(await fetchRpcQueryPack(connector, "polkadot", queries)).toEqual([","])
    expect(connector.send).not.toHaveBeenCalled()
  })

  it("rejects on an empty state_queryStorageAt response instead of decoding all-null", async () => {
    // an empty response is a bad response, not absent values: decoding it would fabricate
    // "no value" for every queried key and downstream deletes the matching balances
    const { connector } = makeFakeConnector()
    ;(connector.send as ReturnType<typeof vi.fn>).mockResolvedValueOnce([])

    let decodes = 0
    const queries = makeQueries(2, (i, value) => {
      decodes++
      return `${i}:${value}`
    })

    await expect(fetchRpcQueryPack(connector, "polkadot", queries)).rejects.toThrow(
      "Empty state_queryStorageAt response"
    )
    expect(decodes).toBe(0)
  })
})
