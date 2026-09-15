import type { Token } from "@talismn/chaindata-provider"
import { describe, expect, it } from "vitest"

import { getSameNetworkMirrorTokenIds } from "./getSameNetworkMirrorTokenIds"

const token = (id: string, networkId: string, mirrorOf?: string) =>
  ({ id, networkId, mirrorOf }) as unknown as Token

describe("getSameNetworkMirrorTokenIds", () => {
  it("returns mirrors whose target is listed on the same network", () => {
    const tokens = [
      token("5042002-evm-native", "5042002"),
      token("5042002-evm-erc20-0x36", "5042002", "5042002-evm-native"),
    ]

    expect(getSameNetworkMirrorTokenIds(tokens)).toEqual(new Set(["5042002-evm-erc20-0x36"]))
  })

  it("keeps mirrors whose target is on another network", () => {
    const tokens = [
      token("moonbeam-substrate-native", "moonbeam"),
      token("1284-evm-native", "1284", "moonbeam-substrate-native"),
    ]

    expect(getSameNetworkMirrorTokenIds(tokens)).toEqual(new Set())
  })

  it("keeps mirrors whose target is not listed", () => {
    const tokens = [token("5042002-evm-erc20-0x36", "5042002", "5042002-evm-native")]

    expect(getSameNetworkMirrorTokenIds(tokens)).toEqual(new Set())
  })
})
