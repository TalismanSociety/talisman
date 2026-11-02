import type { TransactionSerialized } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { describe, expect, it } from "vitest"

import { recoverMessageSigner, recoverTransactionSigner } from "../recoverSigner"

const account = privateKeyToAccount(
  "0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318"
)
const to = "0x000000000000000000000000000000000000dEaD"

describe("recoverTransactionSigner", () => {
  it("recovers the signer of an EIP-1559 transaction", async () => {
    const raw = await account.signTransaction({
      chainId: 8453,
      type: "eip1559",
      to,
      value: 1n,
      nonce: 7,
      gas: 21_000n,
      maxFeePerGas: 2n,
      maxPriorityFeePerGas: 1n,
    })
    expect(recoverTransactionSigner(raw as TransactionSerialized)).toBe(account.address)
  })

  it("recovers the signer of a legacy EIP-155 transaction", async () => {
    const raw = await account.signTransaction({
      chainId: 1,
      type: "legacy",
      to,
      value: 1n,
      nonce: 0,
      gas: 21_000n,
      gasPrice: 1n,
    })
    expect(recoverTransactionSigner(raw as TransactionSerialized)).toBe(account.address)
  })

  it("rejects an unsigned transaction", () => {
    expect(() => recoverTransactionSigner("0x02c5822105808080")).toThrow()
  })
})

describe("recoverMessageSigner", () => {
  it("recovers the signer of a personal message", async () => {
    const signature = await account.signMessage({ message: "hello" })
    expect(recoverMessageSigner("hello", signature)).toBe(account.address)
  })
})
