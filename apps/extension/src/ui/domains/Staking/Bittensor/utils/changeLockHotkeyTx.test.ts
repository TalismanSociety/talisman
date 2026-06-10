import type { ScaleApi } from "@talismn/sapi"
import { describe, expect, it, vi } from "vitest"

import { getBittensorChangeLockHotkeyPayload } from "./changeLockHotkeyTx"

const ADDRESS = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
const DESTINATION_HOTKEY = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"

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

describe("getBittensorChangeLockHotkeyPayload", () => {
  it("wraps the move in Utility.batch_all signed by the coldkey", () => {
    const { sapi, getExtrinsicPayload } = createMockSapi()

    getBittensorChangeLockHotkeyPayload({
      sapi,
      address: ADDRESS,
      netuid: 45,
      destinationHotkey: DESTINATION_HOTKEY,
    })

    const [pallet, method, , options] = getExtrinsicPayload.mock.calls[0]
    expect(pallet).toBe("Utility")
    expect(method).toBe("batch_all")
    expect(options).toEqual({ address: ADDRESS })
  })

  it("moves the lock with move_lock(destination_hotkey, netuid) + remark", () => {
    const { sapi, getExtrinsicPayload } = createMockSapi()

    getBittensorChangeLockHotkeyPayload({
      sapi,
      address: ADDRESS,
      netuid: 45,
      destinationHotkey: DESTINATION_HOTKEY,
    })

    const calls = getBatchedCalls(getExtrinsicPayload)
    expect(calls.map((c) => `${c.pallet}.${c.method}`)).toEqual([
      "SubtensorModule.move_lock",
      "System.remark_with_event",
    ])
    expect(calls[0].args).toEqual({ destination_hotkey: DESTINATION_HOTKEY, netuid: 45 })
  })
})
