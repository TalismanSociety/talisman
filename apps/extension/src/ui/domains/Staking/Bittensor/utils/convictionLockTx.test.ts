import type { ScaleApi } from "@talismn/sapi"
import { describe, expect, it, vi } from "vitest"

import { getBittensorConvictionLockPayload } from "./convictionLockTx"

const ADDRESS = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
const HOTKEY = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"

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

describe("getBittensorConvictionLockPayload", () => {
  it("creates a decaying lock with a direct lock_stake call", () => {
    const { sapi, getDecodedCall, getExtrinsicPayload } = createMockSapi()

    getBittensorConvictionLockPayload({
      sapi,
      address: ADDRESS,
      hotkey: HOTKEY,
      netuid: 45,
      amount: 1_000_000_000n,
      makePerpetual: false,
      currentIsPerpetual: false,
    })

    expect(getDecodedCall).not.toHaveBeenCalled()
    expect(getExtrinsicPayload).toHaveBeenCalledWith(
      "SubtensorModule",
      "lock_stake",
      { hotkey: HOTKEY, netuid: 45, amount: 1_000_000_000n },
      { address: ADDRESS }
    )
  })

  it("batches only lock_stake + set_perpetual_lock when going perpetual", () => {
    const { sapi, getExtrinsicPayload } = createMockSapi()

    getBittensorConvictionLockPayload({
      sapi,
      address: ADDRESS,
      hotkey: HOTKEY,
      netuid: 45,
      amount: 1_000_000_000n,
      makePerpetual: true,
      currentIsPerpetual: false,
    })

    const calls = getBatchedCalls(getExtrinsicPayload)
    expect(calls.map((c) => `${c.pallet}.${c.method}`)).toEqual([
      "SubtensorModule.lock_stake",
      "SubtensorModule.set_perpetual_lock",
    ])
    expect(getExtrinsicPayload.mock.calls[0][0]).toBe("Utility")
    expect(getExtrinsicPayload.mock.calls[0][1]).toBe("batch_all")
    expect(calls[1].args).toEqual({ netuid: 45, enabled: true })
  })

  it("batches only lock_stake + set_perpetual_lock when switching back to decaying", () => {
    const { sapi, getExtrinsicPayload } = createMockSapi()

    getBittensorConvictionLockPayload({
      sapi,
      address: ADDRESS,
      hotkey: HOTKEY,
      netuid: 45,
      amount: 500n,
      makePerpetual: false,
      currentIsPerpetual: true,
    })

    const calls = getBatchedCalls(getExtrinsicPayload)
    expect(calls.map((c) => `${c.pallet}.${c.method}`)).toEqual([
      "SubtensorModule.lock_stake",
      "SubtensorModule.set_perpetual_lock",
    ])
    expect(calls[1].args).toEqual({ netuid: 45, enabled: false })
  })

  it("skips batch_all when target already matches chain mode", () => {
    const { sapi, getExtrinsicPayload } = createMockSapi()

    getBittensorConvictionLockPayload({
      sapi,
      address: ADDRESS,
      hotkey: HOTKEY,
      netuid: 45,
      amount: 500n,
      makePerpetual: true,
      currentIsPerpetual: true,
    })

    expect(getExtrinsicPayload).toHaveBeenCalledWith(
      "SubtensorModule",
      "lock_stake",
      { hotkey: HOTKEY, netuid: 45, amount: 500n },
      { address: ADDRESS }
    )
  })
})
