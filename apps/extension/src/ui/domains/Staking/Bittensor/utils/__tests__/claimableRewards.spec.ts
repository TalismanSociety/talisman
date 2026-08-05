import { type Balance, CLAIMABLE_REWARDS_LABEL } from "@talismn/balances"
import { describe, expect, it } from "vitest"

import { getBittensorClaimablePlancks } from "../claimableRewards"
import { ROOT_NETUID } from "../constants"

const NETWORK_ID = "bittensor"
const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
const BOB = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
const HOTKEY_1 = "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy"
const HOTKEY_2 = "5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw"

const TARGET = { networkId: NETWORK_ID, address: ALICE, hotkey: HOTKEY_1 } as const

const makeClaimBalance = (
  address: string,
  hotkey: string,
  claimablePlancks: bigint,
  netuid = ROOT_NETUID
) =>
  ({
    id: `${address}-${hotkey}`,
    address,
    token: {
      id: `${NETWORK_ID}-substrate-dtao-${netuid}-${hotkey}`,
      type: "substrate-dtao",
      networkId: NETWORK_ID,
      netuid,
      hotkey,
    },
    locks: [{ label: CLAIMABLE_REWARDS_LABEL, amount: { planck: claimablePlancks } }],
  }) as unknown as Balance

describe("getBittensorClaimablePlancks", () => {
  it("returns the rewards of the requested (address, hotkey) pair", () => {
    const balances = [
      makeClaimBalance(ALICE, HOTKEY_1, 100n),
      makeClaimBalance(BOB, HOTKEY_2, 900n),
    ]

    expect(getBittensorClaimablePlancks(balances, TARGET)).toBe(100n)
  })

  it("returns null when the requested entitlement is gone, even if other claims remain", () => {
    const balances = [makeClaimBalance(BOB, HOTKEY_2, 900n)]

    expect(getBittensorClaimablePlancks(balances, TARGET)).toBeNull()
  })

  it("returns null when the requested pair's rewards drop to zero", () => {
    const balances = [makeClaimBalance(ALICE, HOTKEY_1, 0n), makeClaimBalance(BOB, HOTKEY_2, 900n)]

    expect(getBittensorClaimablePlancks(balances, TARGET)).toBeNull()
  })

  it("ignores subnet positions: only root carries basket entitlements", () => {
    const balances = [makeClaimBalance(ALICE, HOTKEY_1, 100n, 45)]

    expect(getBittensorClaimablePlancks(balances, TARGET)).toBeNull()
  })
})
