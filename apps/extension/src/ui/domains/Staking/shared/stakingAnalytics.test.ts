import { catalogue } from "@common/analytics/catalogue"
import type { Network } from "@talismn/chaindata-provider"
import { describe, expect, it } from "vitest"

import { stakingSubmittedReport, stakingTransactionId, valueReport } from "./stakingAnalytics"

const bittensor = { id: "bittensor", platform: "polkadot", __isKnown: true } as unknown as Network
const local = { type: "keypair" } as const
const stamps = { flow_id: "4f1c2b8e-0c56-4c1e-9d5a-6d7c1f2e3a4b", duration_ms: 1200 }

describe("stakingTransactionId", () => {
  it("links the inner transaction behind MEV Shield, the staking call itself", () => {
    expect(stakingTransactionId("0x0a", "0x0b")).toBe("0x0b")
    expect(stakingTransactionId("0x0a")).toBe("0x0a")
  })
})

describe("valueReport", () => {
  it("reports nothing for an account with no signer", () => {
    expect(
      valueReport({ account: { type: "contact" }, network: bittensor, symbol: "TAO", usd: 10 })
    ).toBeNull()
  })

  it("reads an unknown symbol and an unpriced amount as their fallbacks", () => {
    expect(
      valueReport({ account: local, network: bittensor, symbol: "SN 12 alpha", usd: null })
    ).toEqual({ network_id: "bittensor", symbol: "unknown", signer: "local", usd_bucket: "0" })
  })
})

describe("submitted reports", () => {
  it("make a staking_submitted the background accepts", () => {
    const report = stakingSubmittedReport({
      account: local,
      network: bittensor,
      symbol: "TAO",
      usd: 42,
      slippage: { percent: 0.5, isDefault: true },
    })
    const parsed = catalogue.staking_submitted.schema.safeParse({
      ...stamps,
      staking_type: "bittensor",
      direction: "stake",
      netuid: 3,
      ...report,
      mev_shield: true,
    })
    expect(parsed.success).toBe(true)
    expect(report).toMatchObject({ usd_bucket: "10-100", slippage_percent: 0.5 })
  })

  it("make an earn_deposit_submitted the background accepts, without slippage", () => {
    const value = { account: local, network: bittensor, symbol: "TAO", usd: 42 }
    const earn = (report: object | null) =>
      catalogue.earn_deposit_submitted.schema.safeParse({
        ...stamps,
        ...report,
        yield_id: "bittensor-tao-native-staking",
      }).success

    expect(earn(valueReport(value))).toBe(true)
    expect(earn(stakingSubmittedReport(value))).toBe(false)
  })
})
