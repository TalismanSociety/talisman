import { describe, expect, it, vi } from "vitest"

import { buildProxyPayload } from "./buildProxyPayload"

describe("buildProxyPayload", () => {
  const DELEGATE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
  const ADDRESS = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
  const PROXY_TYPE = "Any"
  const DELAY = 0

  const makeMockSapi = (shouldFailFirst: boolean) => {
    let callCount = 0
    return {
      getExtrinsicPayload: vi.fn(
        async (_pallet: string, _method: string, args: Record<string, unknown>) => {
          callCount++
          // Simulate chains that use plain AccountId (no MultiAddress wrapper)
          if (shouldFailFirst && callCount === 1 && typeof args.delegate === "object") {
            throw new Error("Invalid checksum")
          }
          return { payload: { method: "0x1234" }, txMetadata: undefined }
        }
      ),
    }
  }

  it("succeeds with MultiAddress (Enum) format on standard chains", async () => {
    // biome-ignore lint/suspicious/noExplicitAny: test mock
    const sapi = makeMockSapi(false) as any
    const result = await buildProxyPayload(sapi, "add_proxy", DELEGATE, PROXY_TYPE, DELAY, ADDRESS)

    expect(result).toBeDefined()
    expect(sapi.getExtrinsicPayload).toHaveBeenCalledTimes(1)
  })

  it("falls back to plain AccountId on chains that reject MultiAddress", async () => {
    // biome-ignore lint/suspicious/noExplicitAny: test mock
    const sapi = makeMockSapi(true) as any
    const result = await buildProxyPayload(sapi, "add_proxy", DELEGATE, PROXY_TYPE, DELAY, ADDRESS)

    expect(result).toBeDefined()
    expect(sapi.getExtrinsicPayload).toHaveBeenCalledTimes(2)

    // Second call should use plain delegate string
    const secondCallArgs = sapi.getExtrinsicPayload.mock.calls[1][2]
    expect(secondCallArgs.delegate).toBe(DELEGATE)
  })

  it("throws the last error if all variants fail", async () => {
    const sapi = {
      getExtrinsicPayload: vi.fn(async () => {
        throw new Error("some RPC error")
      }),
    }

    await expect(
      // biome-ignore lint/suspicious/noExplicitAny: test mock
      buildProxyPayload(sapi as any, "add_proxy", DELEGATE, PROXY_TYPE, DELAY, ADDRESS)
    ).rejects.toThrow("some RPC error")

    expect(sapi.getExtrinsicPayload).toHaveBeenCalledTimes(2)
  })

  it("works for remove_proxy", async () => {
    // biome-ignore lint/suspicious/noExplicitAny: test mock
    const sapi = makeMockSapi(true) as any
    const result = await buildProxyPayload(
      sapi,
      "remove_proxy",
      DELEGATE,
      PROXY_TYPE,
      DELAY,
      ADDRESS
    )

    expect(result).toBeDefined()
    expect(sapi.getExtrinsicPayload).toHaveBeenCalledWith(
      "Proxy",
      "remove_proxy",
      expect.anything(),
      { address: ADDRESS }
    )
  })
})
