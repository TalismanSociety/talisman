import type { ScaleApi } from "@talismn/sapi"
import { describe, expect, it } from "vitest"

import { getStorageDefault, toBigIntStrict } from "./storageDefault"

const mockSapi = (
  item: { name: string; fallback?: string } | null,
  dec: (data: unknown) => unknown = () => 0n
) =>
  ({
    chain: {
      metadata: {
        pallets: [{ name: "SubtensorModule", storage: { items: item ? [item] : [] } }],
      },
      builder: {
        buildStorage: () => ({ value: { dec } }),
      },
    },
  }) as unknown as ScaleApi

describe("toBigIntStrict", () => {
  it("passes bigints through", () => {
    expect(toBigIntStrict(42n)).toBe(42n)
  })

  it("converts integer numbers", () => {
    expect(toBigIntStrict(42)).toBe(42n)
  })

  it("throws on non-integer numbers", () => {
    expect(() => toBigIntStrict(4.2)).toThrow()
  })

  it("throws on other shapes", () => {
    expect(() => toBigIntStrict(null)).toThrow()
    expect(() => toBigIntStrict(undefined)).toThrow()
    expect(() => toBigIntStrict("42")).toThrow()
    expect(() => toBigIntStrict({ value: 42n })).toThrow()
  })
})

describe("getStorageDefault", () => {
  it("decodes the metadata fallback", () => {
    const sapi = mockSapi({ name: "RootClaimableThreshold", fallback: "0x00" }, () => 123n)
    expect(getStorageDefault(sapi, "SubtensorModule", "RootClaimableThreshold")).toBe(123n)
  })

  it("throws when the pallet is missing", () => {
    const sapi = mockSapi({ name: "RootClaimableThreshold", fallback: "0x00" })
    expect(() => getStorageDefault(sapi, "OtherPallet", "RootClaimableThreshold")).toThrow()
  })

  it("throws when the entry is missing", () => {
    const sapi = mockSapi(null)
    expect(() => getStorageDefault(sapi, "SubtensorModule", "RootClaimableThreshold")).toThrow()
  })

  it("throws when the entry has no fallback", () => {
    const sapi = mockSapi({ name: "RootClaimableThreshold" })
    expect(() => getStorageDefault(sapi, "SubtensorModule", "RootClaimableThreshold")).toThrow()
  })

  it("propagates decode errors", () => {
    const sapi = mockSapi({ name: "RootClaimableThreshold", fallback: "0x00" }, () => {
      throw new Error("bad codec")
    })
    expect(() => getStorageDefault(sapi, "SubtensorModule", "RootClaimableThreshold")).toThrow(
      "bad codec"
    )
  })

  it("throws when the fallback decodes to an unsupported shape", () => {
    const sapi = mockSapi({ name: "RootClaimableThreshold", fallback: "0x00" }, () => ({
      some: "struct",
    }))
    expect(() => getStorageDefault(sapi, "SubtensorModule", "RootClaimableThreshold")).toThrow()
  })
})
