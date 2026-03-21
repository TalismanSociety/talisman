import type { Balance, Balances } from "@talismn/balances"

import { getDefaultValidatorHotkey } from "../getDefaultValidatorHotkey"

const mockBalance = (
  token: { type: string; netuid?: number; hotkey?: string },
  freePlanck: bigint
) =>
  ({
    token,
    free: { planck: freePlanck },
  }) as unknown as Balance

const mockBalances = (items: Balance[]) => ({ each: items }) as unknown as Balances

const remoteConfig = {
  bittensor: {
    defaultValidatorsBySubnet: {
      "1": "5RemoteDefault1",
      "3": "5RemoteDefault3",
    },
  },
}

describe("getDefaultValidatorHotkey", () => {
  test("returns hotkey of the largest dtao balance for the subnet", () => {
    const balances = mockBalances([
      mockBalance({ type: "substrate-dtao", netuid: 1, hotkey: "5Small" }, 100n),
      mockBalance({ type: "substrate-dtao", netuid: 1, hotkey: "5Large" }, 9999n),
      mockBalance({ type: "substrate-dtao", netuid: 1, hotkey: "5Medium" }, 500n),
    ])

    expect(getDefaultValidatorHotkey(1, balances, remoteConfig)).toBe("5Large")
  })

  test("ignores dtao balances from other subnets", () => {
    const balances = mockBalances([
      mockBalance({ type: "substrate-dtao", netuid: 2, hotkey: "5Other" }, 9999n),
    ])

    expect(getDefaultValidatorHotkey(1, balances, remoteConfig)).toBe("5RemoteDefault1")
  })

  test("ignores non-dtao balances", () => {
    const balances = mockBalances([
      mockBalance({ type: "substrate-native", netuid: 1, hotkey: "5Native" }, 9999n),
    ])

    expect(getDefaultValidatorHotkey(1, balances, remoteConfig)).toBe("5RemoteDefault1")
  })

  test("ignores dtao balances with no hotkey", () => {
    const balances = mockBalances([mockBalance({ type: "substrate-dtao", netuid: 1 }, 9999n)])

    expect(getDefaultValidatorHotkey(1, balances, remoteConfig)).toBe("5RemoteDefault1")
  })

  test("ignores dtao balances with zero free planck", () => {
    const balances = mockBalances([
      mockBalance({ type: "substrate-dtao", netuid: 1, hotkey: "5Zero" }, 0n),
    ])

    expect(getDefaultValidatorHotkey(1, balances, remoteConfig)).toBe("5RemoteDefault1")
  })

  test("falls back to remote config when no dtao balances exist", () => {
    const balances = mockBalances([])

    expect(getDefaultValidatorHotkey(3, balances, remoteConfig)).toBe("5RemoteDefault3")
  })

  test("returns undefined when no balances and no remote config entry", () => {
    const balances = mockBalances([])

    expect(getDefaultValidatorHotkey(99, balances, remoteConfig)).toBeUndefined()
  })

  test("prefers user balance over remote config default", () => {
    const balances = mockBalances([
      mockBalance({ type: "substrate-dtao", netuid: 1, hotkey: "5UserStake" }, 500n),
    ])

    expect(getDefaultValidatorHotkey(1, balances, remoteConfig)).toBe("5UserStake")
  })
})
