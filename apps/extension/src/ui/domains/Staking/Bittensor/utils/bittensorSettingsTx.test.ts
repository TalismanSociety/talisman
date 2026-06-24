import type { ScaleApi } from "@talismn/sapi"
import { describe, expect, it, vi } from "vitest"

import { getBittensorSettingsPayload } from "./bittensorSettingsTx"

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

describe("getBittensorSettingsPayload", () => {
  it("returns null when nothing changed", () => {
    const { sapi, getExtrinsicPayload } = createMockSapi()

    const payload = getBittensorSettingsPayload({
      sapi,
      address: ADDRESS,
      includeClaimSettings: false,
      claimType: "Swap",
      includeRejectFlag: false,
      acceptLockedAlpha: false,
    })

    expect(payload).toBeNull()
    expect(getExtrinsicPayload).not.toHaveBeenCalled()
  })

  it("submits a single set_root_claim_type call when only the reward type changed", () => {
    const { sapi, getDecodedCall, getExtrinsicPayload } = createMockSapi()

    getBittensorSettingsPayload({
      sapi,
      address: ADDRESS,
      includeClaimSettings: true,
      claimType: "Keep",
      includeRejectFlag: false,
      acceptLockedAlpha: false,
    })

    expect(getDecodedCall).not.toHaveBeenCalled()
    expect(getExtrinsicPayload).toHaveBeenCalledWith(
      "SubtensorModule",
      "set_root_claim_type",
      { new_root_claim_type: { type: "Keep", value: undefined } },
      { address: ADDRESS }
    )
  })

  it("submits a single set_reject_locked_alpha call (enabled = inverse of accept) when only the toggle changed", () => {
    const { sapi, getDecodedCall, getExtrinsicPayload } = createMockSapi()

    getBittensorSettingsPayload({
      sapi,
      address: ADDRESS,
      includeClaimSettings: false,
      claimType: "Swap",
      includeRejectFlag: true,
      acceptLockedAlpha: true,
    })

    expect(getDecodedCall).not.toHaveBeenCalled()
    expect(getExtrinsicPayload).toHaveBeenCalledWith(
      "SubtensorModule",
      "set_reject_locked_alpha",
      { enabled: false },
      { address: ADDRESS }
    )
  })

  it("batches both calls in Utility.batch_all when both changed", () => {
    const { sapi, getExtrinsicPayload } = createMockSapi()

    getBittensorSettingsPayload({
      sapi,
      address: ADDRESS,
      includeClaimSettings: true,
      claimType: "KeepSubnets",
      selectedSubnets: [3, 1],
      includeRejectFlag: true,
      acceptLockedAlpha: false,
    })

    expect(getExtrinsicPayload.mock.calls[0][0]).toBe("Utility")
    expect(getExtrinsicPayload.mock.calls[0][1]).toBe("batch_all")

    const calls = getBatchedCalls(getExtrinsicPayload)
    expect(calls.map((c) => `${c.pallet}.${c.method}`)).toEqual([
      "SubtensorModule.set_root_claim_type",
      "SubtensorModule.set_reject_locked_alpha",
    ])
    // KeepSubnets subnets are normalised to sorted plain numbers
    expect(calls[0].args).toEqual({
      new_root_claim_type: { type: "KeepSubnets", value: { subnets: [1, 3] } },
    })
    expect(calls[1].args).toEqual({ enabled: true })
  })
})
