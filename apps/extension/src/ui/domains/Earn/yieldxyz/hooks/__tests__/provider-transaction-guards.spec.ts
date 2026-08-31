import type { TransactionDto } from "@core/domains/earn/exports"
import { describe, expect, it } from "vitest"

import {
  getYieldxyzEvmTransactionIssue,
  getYieldxyzSolTransactionIssue,
  getYieldxyzStepMaxNativeValue,
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

describe("getYieldxyzStepMaxNativeValue", () => {
  const ethTransaction = (id: string, value: bigint | null): TransactionDto =>
    ({
      id,
      unsignedTransaction: JSON.stringify({
        from: ADDRESS,
        to: ADDRESS,
        ...(value === null ? {} : { value: `0x${value.toString(16)}` }),
      }),
    }) as TransactionDto

  it("leaves the full amount to a single transaction", () => {
    expect(
      getYieldxyzStepMaxNativeValue({
        transactions: [ethTransaction("deposit", ONE_ETH)],
        transactionId: "deposit",
        maxNativeValue: ONE_ETH,
      })
    ).toBe(ONE_ETH)
  })

  it("leaves the full amount to the step that follows an approval", () => {
    expect(
      getYieldxyzStepMaxNativeValue({
        transactions: [ethTransaction("approval", null), ethTransaction("deposit", ONE_ETH)],
        transactionId: "deposit",
        maxNativeValue: ONE_ETH,
      })
    ).toBe(ONE_ETH)
  })

  it("shares the amount between steps that each spend some of it", () => {
    expect(
      getYieldxyzStepMaxNativeValue({
        transactions: [
          ethTransaction("first", ONE_ETH / 2n),
          ethTransaction("second", ONE_ETH / 2n),
        ],
        transactionId: "second",
        maxNativeValue: ONE_ETH,
      })
    ).toBe(ONE_ETH / 2n)
  })

  it("leaves nothing to a step whose siblings already spend the whole amount", () => {
    const remaining = getYieldxyzStepMaxNativeValue({
      transactions: [ethTransaction("first", ONE_ETH), ethTransaction("second", ONE_ETH)],
      transactionId: "first",
      maxNativeValue: ONE_ETH,
    })

    expect(remaining).toBe(0n)
    expect(
      getYieldxyzEvmTransactionIssue({
        from: ADDRESS,
        value: ONE_ETH,
        address: ADDRESS,
        maxNativeValue: remaining,
      })
    ).toBe("amount")
  })

  it("ignores a transaction it cannot read, such as a Solana payload", () => {
    expect(
      getYieldxyzStepMaxNativeValue({
        transactions: [
          { id: "deposit", unsignedTransaction: "AQAB" } as TransactionDto,
          { id: "other", unsignedTransaction: "AQAC" } as TransactionDto,
        ],
        transactionId: "deposit",
        maxNativeValue: ONE_ETH,
      })
    ).toBe(ONE_ETH)
  })

  it("leaves nothing to any step when a sibling value cannot be read", () => {
    const corruptSibling = {
      id: "corrupt",
      unsignedTransaction: JSON.stringify({ from: ADDRESS, to: ADDRESS, value: "not-a-number" }),
    } as TransactionDto

    const remaining = getYieldxyzStepMaxNativeValue({
      transactions: [ethTransaction("deposit", null), corruptSibling],
      transactionId: "deposit",
      maxNativeValue: ONE_ETH,
    })

    expect(remaining < 0n).toBe(true)
    expect(
      getYieldxyzEvmTransactionIssue({
        from: ADDRESS,
        value: 0n,
        address: ADDRESS,
        maxNativeValue: remaining,
      })
    ).toBe("amount")
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
