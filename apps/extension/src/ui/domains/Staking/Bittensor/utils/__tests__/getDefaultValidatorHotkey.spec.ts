import type { Balance, Balances } from "@talismn/balances"

import { getDefaultValidatorHotkey } from "../getDefaultValidatorHotkey"

const mockBalance = (
  token: { type: string; netuid?: number; hotkey?: string },
  freePlanck: bigint,
  address = "5Default"
) =>
  ({
    token,
    address,
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

    expect(getDefaultValidatorHotkey(1, remoteConfig, balances)).toBe("5Large")
  })

  test("ignores dtao balances from other subnets", () => {
    const balances = mockBalances([
      mockBalance({ type: "substrate-dtao", netuid: 2, hotkey: "5Other" }, 9999n),
    ])

    expect(getDefaultValidatorHotkey(1, remoteConfig, balances)).toBe("5RemoteDefault1")
  })

  test("ignores non-dtao balances", () => {
    const balances = mockBalances([
      mockBalance({ type: "substrate-native", netuid: 1, hotkey: "5Native" }, 9999n),
    ])

    expect(getDefaultValidatorHotkey(1, remoteConfig, balances)).toBe("5RemoteDefault1")
  })

  test("ignores dtao balances with no hotkey", () => {
    const balances = mockBalances([mockBalance({ type: "substrate-dtao", netuid: 1 }, 9999n)])

    expect(getDefaultValidatorHotkey(1, remoteConfig, balances)).toBe("5RemoteDefault1")
  })

  test("ignores dtao balances with zero free planck", () => {
    const balances = mockBalances([
      mockBalance({ type: "substrate-dtao", netuid: 1, hotkey: "5Zero" }, 0n),
    ])

    expect(getDefaultValidatorHotkey(1, remoteConfig, balances)).toBe("5RemoteDefault1")
  })

  test("falls back to remote config when no dtao balances exist", () => {
    const balances = mockBalances([])

    expect(getDefaultValidatorHotkey(3, remoteConfig, balances)).toBe("5RemoteDefault3")
  })

  test("returns undefined when no balances and no remote config entry", () => {
    const balances = mockBalances([])

    expect(getDefaultValidatorHotkey(99, remoteConfig, balances)).toBeUndefined()
  })

  test("prefers user balance over remote config default", () => {
    const balances = mockBalances([
      mockBalance({ type: "substrate-dtao", netuid: 1, hotkey: "5UserStake" }, 500n),
    ])

    expect(getDefaultValidatorHotkey(1, remoteConfig, balances)).toBe("5UserStake")
  })

  test("falls back to remote config when balances is undefined", () => {
    expect(getDefaultValidatorHotkey(1, remoteConfig)).toBe("5RemoteDefault1")
  })

  test("returns undefined when balances is undefined and no remote config entry", () => {
    expect(getDefaultValidatorHotkey(99, remoteConfig)).toBeUndefined()
  })

  test("filters by address when provided", () => {
    const balances = mockBalances([
      mockBalance({ type: "substrate-dtao", netuid: 1, hotkey: "5Alice" }, 9999n, "5AddrAlice"),
      mockBalance({ type: "substrate-dtao", netuid: 1, hotkey: "5Bob" }, 500n, "5AddrBob"),
    ])

    expect(getDefaultValidatorHotkey(1, remoteConfig, balances, "5AddrBob")).toBe("5Bob")
  })

  test("falls back to remote config when address has no matching balances", () => {
    const balances = mockBalances([
      mockBalance({ type: "substrate-dtao", netuid: 1, hotkey: "5Alice" }, 9999n, "5AddrAlice"),
    ])

    expect(getDefaultValidatorHotkey(1, remoteConfig, balances, "5AddrNone")).toBe(
      "5RemoteDefault1"
    )
  })
})
