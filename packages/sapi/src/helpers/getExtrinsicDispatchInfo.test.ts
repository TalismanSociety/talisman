import { describe, expect, it } from "vitest"

import { createRpcStub, getTestScaleApi } from "../__fixtures__/chains"
import { getExtrinsicDispatchInfo } from "./getExtrinsicDispatchInfo"

const SIGNED_TX = new Uint8Array([0x0c, 0x84, 0xaa, 0xbb])

const getChain = (response: string) => {
  const rpc = createRpcStub(() => response)
  const { chain } = getTestScaleApi("polkadot", { send: rpc.send })
  return { chain, calls: rpc.calls }
}

describe("getExtrinsicDispatchInfo", () => {
  it("sends the extrinsic followed by its full encoded length", async () => {
    const { chain, calls } = getChain(`0x0000${"00".repeat(16)}`)

    await getExtrinsicDispatchInfo(chain, SIGNED_TX)

    expect(calls).toEqual([
      {
        method: "state_call",
        params: ["TransactionPaymentApi_query_info", "0x0c84aabb04000000"],
        isCacheable: true,
      },
    ])
  })

  it("reads the partial fee after a WeightV2", async () => {
    const { chain } = getChain(`0xa10f0000${"15cd5b07".padEnd(32, "0")}`)

    expect(await getExtrinsicDispatchInfo(chain, SIGNED_TX)).toEqual({ partialFee: "123456789" })
  })

  it("reads the partial fee after a WeightV1", async () => {
    const weightV1 = "e803000000000000"
    const operational = "01"
    const { chain } = getChain(`0x${weightV1}${operational}${"00e40b5402".padEnd(32, "0")}`)

    expect(await getExtrinsicDispatchInfo(chain, SIGNED_TX)).toEqual({
      partialFee: "10000000000",
    })
  })

  it("reads the full u128 range", async () => {
    const { chain } = getChain(`0x0000${"ff".repeat(16)}`)

    expect(await getExtrinsicDispatchInfo(chain, SIGNED_TX)).toEqual({
      partialFee: (2n ** 128n - 1n).toString(),
    })
  })

  it("throws when the response is shorter than a u128", async () => {
    const { chain } = getChain(`0x${"ff".repeat(15)}`)

    await expect(getExtrinsicDispatchInfo(chain, SIGNED_TX)).rejects.toThrow(
      "Invalid RuntimeDispatchInfo"
    )
  })
})
