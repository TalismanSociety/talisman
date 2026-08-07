import { describe, expect, it } from "vitest"

import {
  getYieldxyzEvmTransactionIssue,
  getYieldxyzSolTransactionIssue,
} from "../provider-transaction-guards"

const ADDRESS = "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a"
const ONE_ETH = 1_000_000_000_000_000_000n

describe("getYieldxyzEvmTransactionIssue", () => {
  it("accepts a native deposit of the amount the user entered", () => {
    expect(
      getYieldxyzEvmTransactionIssue({
        from: ADDRESS,
        value: ONE_ETH,
        address: ADDRESS,
        maxNativeValue: ONE_ETH,
      })
    ).toBeNull()
  })

  it("accepts a transaction carrying no native value", () => {
    expect(
      getYieldxyzEvmTransactionIssue({
        from: ADDRESS,
        value: undefined,
        address: ADDRESS,
        maxNativeValue: 0n,
      })
    ).toBeNull()
  })

  it("ignores address casing", () => {
    expect(
      getYieldxyzEvmTransactionIssue({
        from: ADDRESS.toLowerCase(),
        value: 0n,
        address: ADDRESS,
        maxNativeValue: 0n,
      })
    ).toBeNull()
  })

  it("rejects a native value above the amount the user entered", () => {
    expect(
      getYieldxyzEvmTransactionIssue({
        from: ADDRESS,
        value: ONE_ETH + 1n,
        address: ADDRESS,
        maxNativeValue: ONE_ETH,
      })
    ).toBe("amount")
  })

  it("rejects any native value when the flow moves no native token", () => {
    expect(
      getYieldxyzEvmTransactionIssue({
        from: ADDRESS,
        value: 1n,
        address: ADDRESS,
        maxNativeValue: 0n,
      })
    ).toBe("amount")
  })

  it("rejects a transaction for a different sender", () => {
    expect(
      getYieldxyzEvmTransactionIssue({
        from: "0x0000000000000000000000000000000000000bad",
        value: 0n,
        address: ADDRESS,
        maxNativeValue: 0n,
      })
    ).toBe("sender")
  })

  it("rejects a transaction with no sender", () => {
    expect(
      getYieldxyzEvmTransactionIssue({
        from: undefined,
        value: 0n,
        address: ADDRESS,
        maxNativeValue: 0n,
      })
    ).toBe("sender")
  })
})

describe("getYieldxyzSolTransactionIssue", () => {
  const SOL_ADDRESS = "7VHUFJHWu2CuExkJcJrzhQPJ2oygupTWkL2A2For4BmE"

  it("accepts a transaction paid for by the signing account", () => {
    expect(
      getYieldxyzSolTransactionIssue({ feePayer: SOL_ADDRESS, address: SOL_ADDRESS })
    ).toBeNull()
  })

  it("rejects a transaction paid for by anyone else", () => {
    expect(
      getYieldxyzSolTransactionIssue({
        feePayer: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        address: SOL_ADDRESS,
      })
    ).toBe("sender")
  })
})
