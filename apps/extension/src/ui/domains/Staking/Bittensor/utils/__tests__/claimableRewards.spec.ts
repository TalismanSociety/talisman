import { type Balance, CLAIMABLE_REWARDS_LABEL } from "@talismn/balances"
import { describe, expect, it } from "vitest"

import { getBiggestBittensorClaim, getBittensorClaim } from "../claimableRewards"
import { ROOT_NETUID } from "../constants"

const NETWORK_ID = "bittensor"
const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
const BOB = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
const HOTKEY_1 = "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy"
const HOTKEY_2 = "5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw"

const makeClaimBalance = (address: string, hotkey: string, claimablePlancks: bigint) =>
  ({
    id: `${address}-${hotkey}`,
    address,
    token: {
      id: `${NETWORK_ID}-substrate-dtao-${ROOT_NETUID}-${hotkey}`,
      type: "substrate-dtao",
      networkId: NETWORK_ID,
      netuid: ROOT_NETUID,
      hotkey,
    },
    locks: [{ label: CLAIMABLE_REWARDS_LABEL, amount: { planck: claimablePlancks } }],
  }) as unknown as Balance

const OWNED = [ALICE, BOB]

describe("getBittensorClaim", () => {
  it("returns the claim of the requested (address, hotkey) pair", () => {
    const balances = [
      makeClaimBalance(ALICE, HOTKEY_1, 100n),
      makeClaimBalance(BOB, HOTKEY_2, 900n),
    ]

    const claim = getBittensorClaim(balances, OWNED, {
      networkId: NETWORK_ID,
      address: ALICE,
      hotkey: HOTKEY_1,
    })

    expect(claim?.balance.address).toBe(ALICE)
    expect(claim?.claimablePlancks).toBe(100n)
  })

  it("returns null when the requested entitlement is gone, even if other claims remain", () => {
    const balances = [makeClaimBalance(BOB, HOTKEY_2, 900n)]

    const claim = getBittensorClaim(balances, OWNED, {
      networkId: NETWORK_ID,
      address: ALICE,
      hotkey: HOTKEY_1,
    })

    expect(claim).toBeNull()
  })

  it("returns null when the requested pair's rewards drop to zero", () => {
    const balances = [makeClaimBalance(ALICE, HOTKEY_1, 0n), makeClaimBalance(BOB, HOTKEY_2, 900n)]

    const claim = getBittensorClaim(balances, OWNED, {
      networkId: NETWORK_ID,
      address: ALICE,
      hotkey: HOTKEY_1,
    })

    expect(claim).toBeNull()
  })

  it("ignores claims of accounts we do not own", () => {
    const balances = [makeClaimBalance(ALICE, HOTKEY_1, 100n)]

    const claim = getBittensorClaim(balances, [BOB], {
      networkId: NETWORK_ID,
      address: ALICE,
      hotkey: HOTKEY_1,
    })

    expect(claim).toBeNull()
  })
})

describe("getBiggestBittensorClaim", () => {
  it("picks the biggest claim across accounts and validators", () => {
    const balances = [
      makeClaimBalance(ALICE, HOTKEY_1, 100n),
      makeClaimBalance(BOB, HOTKEY_2, 900n),
      makeClaimBalance(ALICE, HOTKEY_2, 500n),
    ]

    const claim = getBiggestBittensorClaim(balances, OWNED, [NETWORK_ID])

    expect(claim?.balance.address).toBe(BOB)
    expect(claim?.claimablePlancks).toBe(900n)
  })

  it("returns null when nothing is claimable", () => {
    const balances = [makeClaimBalance(ALICE, HOTKEY_1, 0n)]

    expect(getBiggestBittensorClaim(balances, OWNED, [NETWORK_ID])).toBeNull()
  })
})
