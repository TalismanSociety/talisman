import type { EthNetwork } from "@talismn/chaindata-provider"
import { afterEach, describe, expect, it, vi } from "vitest"
import { getTransportForEvmNetwork } from "./getTransportForEvmNetwork"

const network = { id: "964", rpcs: ["https://a.example", "https://b.example"] } as EthNetwork

const jsonResponse = (payload: object) =>
  new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, ...payload }), {
    headers: { "content-type": "application/json" },
  })

const request = (method: string) =>
  getTransportForEvmNetwork(network)({}).request({ method, params: [] })

describe("getTransportForEvmNetwork", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("stops at the first rpc on a Frontier revert", async () => {
    const fetch = vi.fn(async () =>
      jsonResponse({
        error: { code: -32603, message: "VM Exception while processing transaction: revert" },
      })
    )
    vi.stubGlobal("fetch", fetch)

    await expect(request("eth_estimateGas")).rejects.toThrow(
      "VM Exception while processing transaction: revert"
    )
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("stops at the first rpc on an execution reverted error", async () => {
    const fetch = vi.fn(async () =>
      jsonResponse({ error: { code: 3, message: "execution reverted" } })
    )
    vi.stubGlobal("fetch", fetch)

    await expect(request("eth_estimateGas")).rejects.toThrow("execution reverted")
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("falls back to the next rpc on other errors", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: { code: -32601, message: "Method not found" } }))
      .mockResolvedValueOnce(jsonResponse({ result: "0x1" }))
    vi.stubGlobal("fetch", fetch)

    expect(await request("eth_fillTransaction")).toBe("0x1")
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
