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

describe("getBittensorChangeLockHotkeyPayload", () => {
  it("moves the lock with a direct move_lock(destination_hotkey, netuid) call", () => {
    const { sapi, getDecodedCall, getExtrinsicPayload } = createMockSapi()

    getBittensorChangeLockHotkeyPayload({
      sapi,
      address: ADDRESS,
      netuid: 45,
      destinationHotkey: DESTINATION_HOTKEY,
    })

    expect(getDecodedCall).not.toHaveBeenCalled()
    expect(getExtrinsicPayload).toHaveBeenCalledWith(
      "SubtensorModule",
      "move_lock",
      { destination_hotkey: DESTINATION_HOTKEY, netuid: 45 },
      { address: ADDRESS }
    )
  })
})
