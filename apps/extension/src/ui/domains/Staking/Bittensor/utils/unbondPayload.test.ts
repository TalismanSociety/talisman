import type { ScaleApi } from "@talismn/sapi"
import { describe, expect, it, vi } from "vitest"

import { getBittensorUnbondPayload } from "./helpers"

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

const unbond = (
  sapi: ScaleApi,
  overrides: Partial<Parameters<typeof getBittensorUnbondPayload>[0]> = {}
) =>
  getBittensorUnbondPayload({
    sapi,
    address: ADDRESS,
    hotkey: HOTKEY,
    amount: 1_000_000_000n,
    netuid: 0,
    priceLimit: 950_000_000n,
    talismanFee: 1_000_000n,
    remarkType: "stake",
    ...overrides,
  })

describe("getBittensorUnbondPayload (root)", () => {
  it("batches remove_stake then claim for a partial unstake with claim", () => {
    const { sapi, getExtrinsicPayload } = createMockSapi()

    unbond(sapi, { withClaim: true })

    expect(getExtrinsicPayload.mock.calls[0][0]).toBe("Utility")
    expect(getExtrinsicPayload.mock.calls[0][1]).toBe("batch_all")
    const calls = getBatchedCalls(getExtrinsicPayload)
    expect(calls.map((c) => `${c.pallet}.${c.method}`)).toEqual([
      "SubtensorModule.remove_stake",
      "SubtensorModule.claim_root_with_hotkey",
      "System.remark_with_event",
    ])
    expect(calls[0].args).toEqual({ hotkey: HOTKEY, netuid: 0, amount_unstaked: 1_000_000_000n })
  })

  it("batches claim first then remove_stake_full_limit for a full exit", () => {
    const { sapi, getExtrinsicPayload } = createMockSapi()

    unbond(sapi, { withClaim: true, fullExit: true })

    const calls = getBatchedCalls(getExtrinsicPayload)
    expect(calls.map((c) => `${c.pallet}.${c.method}`)).toEqual([
      "SubtensorModule.claim_root_with_hotkey",
      "SubtensorModule.remove_stake_full_limit",
      "System.remark_with_event",
    ])
    expect(calls[0].args).toEqual({ hotkey: HOTKEY })
    expect(calls[1].args).toEqual({ hotkey: HOTKEY, netuid: 0, limit_price: undefined })
  })

  it("ignores fullExit without the claim: plain remove_stake", () => {
    const { sapi, getExtrinsicPayload } = createMockSapi()

    unbond(sapi, { withClaim: false, fullExit: true })

    const calls = getBatchedCalls(getExtrinsicPayload)
    expect(calls.map((c) => `${c.pallet}.${c.method}`)).toEqual([
      "SubtensorModule.remove_stake",
      "System.remark_with_event",
    ])
  })

  it("keeps the subnet branch untouched by the claim flags", () => {
    const { sapi, getExtrinsicPayload } = createMockSapi()

    unbond(sapi, { netuid: 45, withClaim: true, fullExit: true })

    const calls = getBatchedCalls(getExtrinsicPayload)
    expect(calls.map((c) => `${c.pallet}.${c.method}`)).toEqual([
      "SubtensorModule.remove_stake_limit",
      "Balances.transfer_keep_alive",
      "System.remark_with_event",
    ])
    expect(calls[0].args).toEqual({
      hotkey: HOTKEY,
      netuid: 45,
      amount_unstaked: 1_000_000_000n,
      limit_price: 950_000_000n,
      allow_partial: false,
    })
  })
})
