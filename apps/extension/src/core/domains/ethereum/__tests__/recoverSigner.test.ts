import { privateKeyToAccount } from "viem/accounts"
import { describe, expect, it } from "vitest"

import { recoverMessageSigner } from "../recoverSigner"

const account = privateKeyToAccount(
  "0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318"
)

describe("recoverMessageSigner", () => {
  it("recovers the signer of a personal message", async () => {
    const signature = await account.signMessage({ message: "hello" })
    expect(recoverMessageSigner("hello", signature)).toBe(account.address)
  })
})
