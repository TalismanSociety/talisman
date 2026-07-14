import { isEqual } from "lodash-es"
import { describe, expect, it } from "vitest"

import type { BalancesResult } from "../BalancesProvider"
import type { IBalance } from "./balancetypes"
import {
  getBalanceStorageFingerprint,
  isEqualBalanceArrays,
  isEqualBalancesResult,
  isEqualMiniMetadatas,
  isEqualModuleResults,
} from "./fingerprint"
import type { MiniMetadata } from "./minimetadatas"

const makeBalance = (partial: Partial<IBalance> & Record<string, unknown> = {}): IBalance =>
  ({
    address: "0x01",
    tokenId: "test-token",
    networkId: "test-network",
    source: "substrate-native",
    status: "live",
    values: [
      { type: "free", label: "free", amount: "1000", meta: { nested: { deep: 1 } } },
      { type: "reserved", label: "reserved", amount: "5" },
    ],
    ...partial,
  }) as IBalance

const makeResult = (partial: Partial<BalancesResult> = {}): BalancesResult => ({
  status: "live",
  balances: [makeBalance()],
  failedBalanceIds: [],
  ...partial,
})

describe("isEqualBalanceArrays", () => {
  it("agrees with lodash isEqual for freshly-allocated equal and unequal arrays", () => {
    const equalPairs: Array<[IBalance[], IBalance[]]> = [
      [[], []],
      [[makeBalance()], [makeBalance()]],
      [
        [makeBalance(), makeBalance({ tokenId: "other" })],
        [makeBalance(), makeBalance({ tokenId: "other" })],
      ],
    ]
    const unequalPairs: Array<[IBalance[], IBalance[]]> = [
      [[makeBalance()], []],
      [[makeBalance()], [makeBalance({ address: "0x02" })]],
      [[makeBalance()], [makeBalance({ values: [] })]],
      [
        [
          makeBalance({
            values: [
              { type: "free", label: "free", amount: "1000", meta: { nested: { deep: 1 } } },
            ],
          }),
        ],
        [
          makeBalance({
            values: [
              { type: "free", label: "free", amount: "1000", meta: { nested: { deep: 2 } } },
            ],
          }),
        ],
      ],
    ]

    for (const [a, b] of equalPairs) {
      expect(isEqualBalanceArrays(a, b)).toBe(true)
      expect(isEqual(a, b)).toBe(true)
    }
    for (const [a, b] of unequalPairs) {
      expect(isEqualBalanceArrays(a, b)).toBe(false)
      expect(isEqual(a, b)).toBe(false)
    }
  })
})

describe("isEqualBalancesResult", () => {
  it("compares status, failedBalanceIds and balances", () => {
    expect(isEqualBalancesResult(makeResult(), makeResult())).toBe(true)
    expect(isEqualBalancesResult(makeResult(), makeResult({ status: "initialising" }))).toBe(false)
    expect(isEqualBalancesResult(makeResult(), makeResult({ failedBalanceIds: ["x"] }))).toBe(false)
    expect(isEqualBalancesResult(makeResult(), makeResult({ balances: [] }))).toBe(false)
    expect(
      isEqualBalancesResult(
        makeResult(),
        makeResult({ balances: [makeBalance({ address: "0x02" })] })
      )
    ).toBe(false)
  })
})

describe("isEqualModuleResults", () => {
  it("dedupes identical results even when Error instances differ", () => {
    const a = {
      success: [makeBalance()],
      errors: [{ tokenId: "t", address: "a", error: new Error("boom") }],
    }
    const b = {
      success: [makeBalance()],
      errors: [{ tokenId: "t", address: "a", error: new Error("boom (different instance)") }],
    }
    expect(isEqualModuleResults(a, b)).toBe(true)
  })

  it("detects changes in success balances, errors and dynamic tokens", () => {
    const base = { success: [makeBalance()], errors: [] }
    expect(isEqualModuleResults(base, { ...base, success: [] })).toBe(false)
    expect(
      isEqualModuleResults(base, {
        ...base,
        errors: [{ tokenId: "t", address: "a", error: new Error("x") }],
      })
    ).toBe(false)
    expect(
      isEqualModuleResults(base, { ...base, dynamicTokens: [{ id: "new-token" } as never] })
    ).toBe(false)
  })
})

describe("isEqualMiniMetadatas", () => {
  const makeMini = (partial: Partial<MiniMetadata> = {}): MiniMetadata =>
    ({
      id: "abc",
      source: "substrate-native",
      chainId: "polkadot",
      specVersion: 1,
      version: "1",
      data: "0x1234",
      extra: null,
      ...partial,
    }) as MiniMetadata

  it("compares by id and data", () => {
    expect(isEqualMiniMetadatas([makeMini()], [makeMini()])).toBe(true)
    expect(isEqualMiniMetadatas([makeMini()], [makeMini({ id: "other" })])).toBe(false)
    expect(isEqualMiniMetadatas([makeMini()], [makeMini({ data: "0xff" })])).toBe(false)
    expect(isEqualMiniMetadatas([makeMini()], [])).toBe(false)
    expect(isEqualMiniMetadatas(null, [makeMini()])).toBe(false)
    expect(isEqualMiniMetadatas(null, null)).toBe(true)
  })
})

describe("getBalanceStorageFingerprint", () => {
  it("ignores status but not content", () => {
    const live = makeBalance({ status: "live" })
    const cache = makeBalance({ status: "cache" })
    const different = makeBalance({ status: "cache", values: [] })

    expect(getBalanceStorageFingerprint(live)).toBe(getBalanceStorageFingerprint(cache))
    expect(getBalanceStorageFingerprint(live)).not.toBe(getBalanceStorageFingerprint(different))
  })
})
