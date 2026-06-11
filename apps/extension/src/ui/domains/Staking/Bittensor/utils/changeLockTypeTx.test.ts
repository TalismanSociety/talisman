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

describe("getBittensorChangeLockTypePayload", () => {
  it("switches to perpetual with a direct set_perpetual_lock(enabled: true) call", () => {
    const { sapi, getDecodedCall, getExtrinsicPayload } = createMockSapi()

    getBittensorChangeLockTypePayload({
      sapi,
      address: ADDRESS,
      netuid: 45,
      makePerpetual: true,
    })

    expect(getDecodedCall).not.toHaveBeenCalled()
    expect(getExtrinsicPayload).toHaveBeenCalledWith(
      "SubtensorModule",
      "set_perpetual_lock",
      { netuid: 45, enabled: true },
      { address: ADDRESS }
    )
  })

  it("switches back to decaying with a direct set_perpetual_lock(enabled: false) call", () => {
    const { sapi, getExtrinsicPayload } = createMockSapi()

    getBittensorChangeLockTypePayload({
      sapi,
      address: ADDRESS,
      netuid: 45,
      makePerpetual: false,
    })

    expect(getExtrinsicPayload).toHaveBeenCalledWith(
      "SubtensorModule",
      "set_perpetual_lock",
      { netuid: 45, enabled: false },
      { address: ADDRESS }
    )
  })
})
