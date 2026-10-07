import type { DefiPosition } from "@core/domains/defi/exports"
import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { isBittensorDefiPosition } from "../bittensor/bittensorStakePosition"
import type { EarnPosition } from "../types"

const ADDRESS = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
const TAO_ID = "bittensor:substrate-native"

const rootPosition = {
  id: "bittensor-root",
  address: ADDRESS,
  networkId: "bittensor",
  tokenIds: [TAO_ID],
} as EarnPosition

const defiPosition = (id: string, type: DefiPosition["type"]): DefiPosition => ({
  id,
  name: "TAO",
  type,
  address: ADDRESS,
  networkId: "bittensor",
  defiId: "some-protocol",
  defiName: "Some Protocol",
  defiLogoUrl: null,
  defiUrl: null,
  poolAddress: null,
  symbol: "TAO",
  rewardsUsd: 0,
  rewardsUsdChange1d: 0,
  breakdown: [
    {
      type: "deposit",
      contract_address: null,
      symbol: "TAO",
      decimals: 9,
      name: "TAO",
      logo: null,
      amount: "1000000000",
      valueUsd: 300,
      valueUsdChange1d: 0,
    },
  ],
})

vi.mock("../systems/registry", () => ({
  useEarnSystemPositions: () => [
    {
      status: "success",
      positions: [rootPosition],
      isDuplicateDefiPosition: isBittensorDefiPosition,
    },
  ],
}))
vi.mock("@ui/state/defi", () => ({
  useDefiPositions: () => ({
    status: "success",
    data: [defiPosition("staking-row", "staking"), defiPosition("deposit-row", "deposit")],
  }),
}))
vi.mock("@ui/state/chaindata", () => ({
  useTokensMap: () => ({ [TAO_ID]: { id: TAO_ID, decimals: 9 } }),
  useNetworksMapById: () => ({ bittensor: { id: "bittensor", platform: "polkadot" } }),
}))
vi.mock("@ui/state/tokenRates", () => ({ useTokenRatesMap: () => ({}) }))

import { useEarnPositions } from "./useEarnPositions"

describe("useEarnPositions", () => {
  it("hides a DeFi staking row that duplicates a Bittensor root position, keeps other TAO exposure", () => {
    const { result } = renderHook(() => useEarnPositions())

    expect(result.current.data?.map((position) => position.id)).toEqual([
      "bittensor-root",
      "defi-deposit-row",
    ])
  })
})
