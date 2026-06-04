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
  it("wraps the lock in Utility.batch_all signed by the coldkey", () => {
    const { sapi, getExtrinsicPayload } = createMockSapi()

    getBittensorConvictionLockPayload({
      sapi,
      address: ADDRESS,
      hotkey: HOTKEY,
      netuid: 45,
      amount: 1_000_000_000n,
      makePerpetual: false,
      isAlreadyPerpetual: false,
    })

    const [pallet, method, , options] = getExtrinsicPayload.mock.calls[0]
    expect(pallet).toBe("Utility")
    expect(method).toBe("batch_all")
    expect(options).toEqual({ address: ADDRESS })
  })

  it("creates a decaying lock with just lock_stake + remark", () => {
    const { sapi, getExtrinsicPayload } = createMockSapi()

    getBittensorConvictionLockPayload({
      sapi,
      address: ADDRESS,
      hotkey: HOTKEY,
      netuid: 45,
      amount: 1_000_000_000n,
      makePerpetual: false,
      isAlreadyPerpetual: false,
    })

    const calls = getBatchedCalls(getExtrinsicPayload)
    expect(calls.map((c) => `${c.pallet}.${c.method}`)).toEqual([
      "SubtensorModule.lock_stake",
      "System.remark_with_event",
    ])
    expect(calls[0].args).toEqual({ hotkey: HOTKEY, netuid: 45, amount: 1_000_000_000n })
  })

  it("batches set_perpetual_lock after lock_stake when going perpetual", () => {
    const { sapi, getExtrinsicPayload } = createMockSapi()

    getBittensorConvictionLockPayload({
      sapi,
      address: ADDRESS,
      hotkey: HOTKEY,
      netuid: 45,
      amount: 1_000_000_000n,
      makePerpetual: true,
      isAlreadyPerpetual: false,
    })

    const calls = getBatchedCalls(getExtrinsicPayload)
    // lock_stake must come first (the lock must exist before the flag flip), remark last
    expect(calls.map((c) => `${c.pallet}.${c.method}`)).toEqual([
      "SubtensorModule.lock_stake",
      "SubtensorModule.set_perpetual_lock",
      "System.remark_with_event",
    ])
    expect(calls[1].args).toEqual({ netuid: 45, enabled: true })
  })

  it("skips set_perpetual_lock when the lock is already perpetual", () => {
    const { sapi, getExtrinsicPayload } = createMockSapi()

    getBittensorConvictionLockPayload({
      sapi,
      address: ADDRESS,
      hotkey: HOTKEY,
      netuid: 45,
      amount: 500n,
      makePerpetual: true,
      isAlreadyPerpetual: true,
    })

    const calls = getBatchedCalls(getExtrinsicPayload)
    expect(calls.map((c) => `${c.pallet}.${c.method}`)).toEqual([
      "SubtensorModule.lock_stake",
      "System.remark_with_event",
    ])
  })
})
