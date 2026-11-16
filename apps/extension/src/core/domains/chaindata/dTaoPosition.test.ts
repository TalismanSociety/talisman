import { type SubDTaoToken, TokenSchema } from "@talismn/chaindata-provider"
import { describe, expect, it } from "vitest"

import { buildDTaoPositionToken } from "./dTaoPosition"

const HOTKEY = "5HEo565WAy4Dbq3Sv271SAi7syBSofyfhhwRNjFNSM2gP9M2"

const subnet = TokenSchema.parse({
  id: "bittensor:substrate-dtao:64",
  type: "substrate-dtao",
  platform: "polkadot",
  networkId: "bittensor",
  netuid: 64,
  symbol: "ش",
  decimals: 9,
  name: "Chutes",
  subnetName: "Chutes",
}) as SubDTaoToken

describe("buildDTaoPositionToken", () => {
  it("is the subnet's token under the position's id, with the validator's hotkey", () => {
    expect(buildDTaoPositionToken(subnet, HOTKEY)).toEqual({
      ...subnet,
      id: `bittensor:substrate-dtao:64:${HOTKEY}`,
      hotkey: HOTKEY,
    })
  })

  it("drops what the wallet's own listing added to the subnet's token", () => {
    const listed = { ...subnet, __isKnown: true, __isCustom: false } as SubDTaoToken

    expect(buildDTaoPositionToken(listed, HOTKEY)).toEqual(buildDTaoPositionToken(subnet, HOTKEY))
  })
})
