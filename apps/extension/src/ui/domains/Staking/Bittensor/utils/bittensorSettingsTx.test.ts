import type { ScaleApi } from "@talismn/sapi"
import { describe, expect, it, vi } from "vitest"

import { getBittensorSettingsPayload } from "./bittensorSettingsTx"

const ADDRESS = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"

const createMockSapi = () => {
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
  const sapi = { getExtrinsicPayload } as unknown as ScaleApi
  return { sapi, getExtrinsicPayload }
}

describe("getBittensorSettingsPayload", () => {
  it("submits set_reject_locked_alpha with enabled = inverse of accept", () => {
    const { sapi, getExtrinsicPayload } = createMockSapi()

    getBittensorSettingsPayload({ sapi, address: ADDRESS, acceptLockedAlpha: true })

    expect(getExtrinsicPayload).toHaveBeenCalledWith(
      "SubtensorModule",
      "set_reject_locked_alpha",
      { enabled: false },
      { address: ADDRESS }
    )
  })

  it("submits enabled = true when the user rejects locked alpha", () => {
    const { sapi, getExtrinsicPayload } = createMockSapi()

    getBittensorSettingsPayload({ sapi, address: ADDRESS, acceptLockedAlpha: false })

    expect(getExtrinsicPayload).toHaveBeenCalledWith(
      "SubtensorModule",
      "set_reject_locked_alpha",
      { enabled: true },
      { address: ADDRESS }
    )
  })
})
