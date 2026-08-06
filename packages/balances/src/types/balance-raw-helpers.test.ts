import { describe, expect, it } from "vitest"

import { Balance, getRawLocks, getRawTotalPlanck } from "./balances"
import type { AmountWithLabel, BalanceJson } from "./balancetypes"

const makeBalanceJson = (partial: Partial<BalanceJson> & Record<string, unknown>): BalanceJson =>
  ({
    address: "0x01",
    tokenId: "test-token",
    networkId: "test-network",
    source: "substrate-native",
    status: "live",
    ...partial,
  }) as BalanceJson

const CASES: Array<[string, BalanceJson]> = [
  ["simple balance (value field)", makeBalanceJson({ value: "5000000000000" })],
  ["simple zero balance", makeBalanceJson({ value: "0" })],
  [
    "complex balance with free + reserved",
    makeBalanceJson({
      values: [
        { type: "free", label: "free", amount: "1000" },
        { type: "free", label: "more-free", amount: "500" },
        { type: "reserved", label: "reserved", amount: "300" },
      ] satisfies AmountWithLabel<string>[],
    }),
  ],
  [
    "nompool staking WITHOUT DelegatedStaking hold (old model: added to total)",
    makeBalanceJson({
      values: [
        { type: "free", label: "free", amount: "1000" },
        { type: "nompool", label: "nompool-staking", amount: "700" },
        { type: "locked", label: "some-lock", amount: "100", source: "substrate-native-locks" },
      ] satisfies AmountWithLabel<string>[],
    }),
  ],
  [
    "nompool staking WITH DelegatedStaking hold (new model: already in reserved)",
    makeBalanceJson({
      values: [
        { type: "free", label: "free", amount: "1000" },
        { type: "reserved", label: "reserved", amount: "700" },
        { type: "nompool", label: "nompool-staking", amount: "700" },
        {
          type: "locked",
          label: "DelegatedStaking",
          amount: "700",
          source: "substrate-native-holds",
        },
      ] satisfies AmountWithLabel<string>[],
    }),
  ],
  [
    "extra amounts with and without includeInTotal",
    makeBalanceJson({
      values: [
        { type: "free", label: "free", amount: "100" },
        { type: "extra", label: "counted", amount: "50", includeInTotal: true },
        { type: "extra", label: "not-counted", amount: "999" },
      ] satisfies AmountWithLabel<string>[],
    }),
  ],
  [
    "zero free with a transferable-flagged lock and a counted extra",
    makeBalanceJson({
      source: "substrate-dtao",
      values: [
        { type: "free", label: "Subnet Staking", amount: "0" },
        { type: "locked", label: "informational lock", amount: "42", includeInTransferable: true },
        { type: "extra", label: "counted extra", amount: "42", includeInTotal: true },
      ] satisfies AmountWithLabel<string>[],
    }),
  ],
  ["empty values array", makeBalanceJson({ values: [] })],
]

describe("getRawTotalPlanck", () => {
  it.each(CASES)("matches new Balance(b).total.planck: %s", (_label, json) => {
    expect(getRawTotalPlanck(json)).toBe(new Balance(json).total.planck)
  })
})

describe("getRawLocks", () => {
  it.each(CASES)("matches the Balance locks (raw amounts): %s", (_label, json) => {
    const balance = new Balance(json)
    const rawLocks = getRawLocks(json)
    expect(rawLocks.map((l) => BigInt(l.amount))).toEqual(balance.locks.map((l) => l.amount.planck))
    expect(rawLocks.map((l) => l.label)).toEqual(balance.locks.map((l) => l.label))
  })
})
