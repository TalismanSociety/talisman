import type { TransactionDto } from "@core/domains/earn/exports"
import { describe, expect, it } from "vitest"

import {
  deserializeYieldxyzEthTransaction,
  getYieldxyzEthTransactionValue,
} from "../yieldxyz-eth-transaction"

const ADDRESS = "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a"
const ONE_ETH = 1_000_000_000_000_000_000n

const dto = (unsignedTransaction: string): TransactionDto =>
  ({ id: "tx", unsignedTransaction }) as TransactionDto

const ethPayload = (value?: string) =>
  dto(JSON.stringify({ from: ADDRESS, to: ADDRESS, data: "0x", ...(value ? { value } : {}) }))

describe("deserializeYieldxyzEthTransaction", () => {
  it("deserializes a provider transaction", () => {
    expect(deserializeYieldxyzEthTransaction(ethPayload(`0x${ONE_ETH.toString(16)}`), 5)).toEqual({
      from: ADDRESS,
      to: ADDRESS,
      value: ONE_ETH,
      data: "0x",
      nonce: 5,
    })
  })

  it("returns null for a payload that is not JSON, such as a Solana payload", () => {
    expect(deserializeYieldxyzEthTransaction(dto("AQAB"), 5)).toBeNull()
  })

  it("returns null for a JSON payload that is not an object", () => {
    expect(deserializeYieldxyzEthTransaction(dto(JSON.stringify("AQAB")), 5)).toBeNull()
  })

  it("returns null instead of throwing when the value cannot be read", () => {
    expect(deserializeYieldxyzEthTransaction(ethPayload("not-a-number"), 5)).toBeNull()
  })
})

describe("getYieldxyzEthTransactionValue", () => {
  it("reads the value of a provider transaction", () => {
    expect(getYieldxyzEthTransactionValue(ethPayload(`0x${ONE_ETH.toString(16)}`))).toBe(ONE_ETH)
  })

  it("reads a missing value as zero", () => {
    expect(getYieldxyzEthTransactionValue(ethPayload())).toBe(0n)
  })

  it("reads a payload that is not an EVM transaction as zero", () => {
    expect(getYieldxyzEthTransactionValue(dto("AQAB"))).toBe(0n)
  })

  it("returns null instead of throwing when the value cannot be read", () => {
    expect(getYieldxyzEthTransactionValue(ethPayload("not-a-number"))).toBeNull()
  })
})
