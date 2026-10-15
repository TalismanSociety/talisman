import { describe, expect, it } from "vitest"

import { createRpcStub, getTestScaleApi } from "../__fixtures__/chains"

const HASH_1 = `0x${"11".repeat(32)}`
const HASH_2 = `0x${"22".repeat(32)}`

const getBlockHashCodec = () =>
  getTestScaleApi("polkadot").chain.builder.buildStorage("System", "BlockHash")

describe("getStorageValues", () => {
  it("reads every key in one request and returns the values in input order", async () => {
    const codec = getBlockHashCodec()
    const [key1, key2, key3, key4] = [1, 2, 3, 4].map((blockNumber) => codec.keys.enc(blockNumber))
    const rpc = createRpcStub(() => [
      {
        block: "0xbb",
        changes: [
          [key3, null],
          [key2, HASH_2],
          [key1, HASH_1],
        ],
      },
    ])
    const api = getTestScaleApi("polkadot", { send: rpc.send })

    const values = await api.getStorageValues<string>(
      "System",
      "BlockHash",
      [[1], [2], [3], [4]],
      "0xaa"
    )

    expect(values).toEqual([HASH_1, HASH_2, null, null])
    expect(rpc.calls).toEqual([
      { method: "state_queryStorageAt", params: [[key1, key2, key3, key4], "0xaa"] },
    ])
  })

  it("sends no request for an empty key list", async () => {
    expect(await getTestScaleApi("polkadot").getStorageValues("System", "BlockHash", [])).toEqual(
      []
    )
  })
})
