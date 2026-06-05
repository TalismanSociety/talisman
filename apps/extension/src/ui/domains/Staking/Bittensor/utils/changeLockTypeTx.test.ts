import type { ScaleApi } from "@talismn/sapi"
import { describe, expect, it, vi } from "vitest"

import { getBittensorChangeLockTypePayload } from "./changeLockTypeTx"

const ADDRESS = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"

const createMockSapi = () => {
  const getDecodedCall = vi.fn((pallet: string, method: string, args: unknown) => ({
    pallet,
    method,
    args,
  }))
  const getExtrinsicPayload = vi.fn(
    (pallet: string, method: string, params: unknown, options: unknown) => ({
      pallet,
      method,
      params,
      options,
      payload: "0xpayload",
      txMetadata: "0xmeta",
    })
  )
  const sapi = { getDecodedCall, getExtrinsicPayload } as unknown as ScaleApi
  return { sapi, getDecodedCall, getExtrinsicPayload }
}

const getBatchedCalls = (getExtrinsicPayload: ReturnType<typeof vi.fn>) =>
  getExtrinsicPayload.mock.calls[0][2].calls as Array<{
    pallet: string
    method: string
    args: Record<string, unknown>
  }>

describe("getBittensorChangeLockTypePayload", () => {
  it("wraps the flag flip in Utility.batch_all signed by the coldkey", () => {
    const { sapi, getExtrinsicPayload } = createMockSapi()

    getBittensorChangeLockTypePayload({
      sapi,
      address: ADDRESS,
      netuid: 45,
      makePerpetual: true,
    })

    const [pallet, method, , options] = getExtrinsicPayload.mock.calls[0]
    expect(pallet).toBe("Utility")
    expect(method).toBe("batch_all")
    expect(options).toEqual({ address: ADDRESS })
  })

  it("switches to perpetual with set_perpetual_lock(enabled: true) + remark", () => {
    const { sapi, getExtrinsicPayload } = createMockSapi()

    getBittensorChangeLockTypePayload({
      sapi,
      address: ADDRESS,
      netuid: 45,
      makePerpetual: true,
    })

    const calls = getBatchedCalls(getExtrinsicPayload)
    expect(calls.map((c) => `${c.pallet}.${c.method}`)).toEqual([
      "SubtensorModule.set_perpetual_lock",
      "System.remark_with_event",
    ])
    expect(calls[0].args).toEqual({ netuid: 45, enabled: true })
  })

  it("switches back to decaying with set_perpetual_lock(enabled: false) + remark", () => {
    const { sapi, getExtrinsicPayload } = createMockSapi()

    getBittensorChangeLockTypePayload({
      sapi,
      address: ADDRESS,
      netuid: 45,
      makePerpetual: false,
    })

    const calls = getBatchedCalls(getExtrinsicPayload)
    expect(calls.map((c) => `${c.pallet}.${c.method}`)).toEqual([
      "SubtensorModule.set_perpetual_lock",
      "System.remark_with_event",
    ])
    expect(calls[0].args).toEqual({ netuid: 45, enabled: false })
  })
})
