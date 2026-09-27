import type { Account } from "@talismn/keyring"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { passwordStore } from "../app/store.password"
import { keyringStore } from "./store"
import { withSecretKey } from "./withSecretKey"

const ADDRESS = "5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TTpu"

const keypair = { type: "keypair", curve: "ed25519", address: ADDRESS } as Account

describe("withSecretKey", () => {
  let secretKey: Uint8Array

  beforeEach(() => {
    secretKey = new Uint8Array(32).fill(9)
    vi.spyOn(keyringStore, "getAccount").mockResolvedValue(keypair)
    vi.spyOn(keyringStore, "getAccountSecretKey").mockResolvedValue(secretKey)
    vi.spyOn(passwordStore, "getPassword").mockResolvedValue("hashed")
    vi.spyOn(passwordStore, "clearPassword").mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("passes the secret key and curve to the callback and returns its result", async () => {
    const result = await withSecretKey(ADDRESS, async (key, curve) => `${key[0]}-${curve}`)

    expect(result.ok && result.val).toBe("9-ed25519")
    expect(keyringStore.getAccountSecretKey).toHaveBeenCalledWith(ADDRESS, "hashed")
  })

  it("zeroes the secret key once the callback returns", async () => {
    await withSecretKey(ADDRESS, (key) => {
      expect(key.every((byte) => byte === 9)).toBe(true)
    })

    expect(secretKey.every((byte) => byte === 0)).toBe(true)
  })

  it("zeroes the secret key when the callback throws, and returns the error", async () => {
    const error = new Error("boom")

    const result = await withSecretKey(ADDRESS, () => {
      throw error
    })

    expect(result.err && result.val).toBe(error)
    expect(secretKey.every((byte) => byte === 0)).toBe(true)
    expect(passwordStore.clearPassword).not.toHaveBeenCalled()
  })

  it("fails for an unknown account", async () => {
    vi.mocked(keyringStore.getAccount).mockResolvedValue(null as never)

    const result = await withSecretKey(ADDRESS, vi.fn())

    expect(result.err && result.val).toBe("Account not found")
  })

  it.each(["watch-only", "ledger-polkadot", "polkadot-vault", "signet"])(
    "fails for a %s account, which holds no private key",
    async (type) => {
      vi.mocked(keyringStore.getAccount).mockResolvedValue({ ...keypair, type } as Account)
      const cb = vi.fn()

      const result = await withSecretKey(ADDRESS, cb)

      expect(result.err && result.val).toBe("Private key unavailable")
      expect(keyringStore.getAccountSecretKey).not.toHaveBeenCalled()
      expect(cb).not.toHaveBeenCalled()
    }
  )

  it("fails while the wallet is locked", async () => {
    vi.mocked(passwordStore.getPassword).mockResolvedValue(undefined)
    const cb = vi.fn()

    const result = await withSecretKey(ADDRESS, cb)

    expect(result.err && result.val).toBe("Unauthorised")
    expect(keyringStore.getAccountSecretKey).not.toHaveBeenCalled()
    expect(cb).not.toHaveBeenCalled()
  })

  it("locks the wallet when the secret key cannot be decrypted", async () => {
    const error = new Error("Invalid password")
    vi.mocked(keyringStore.getAccountSecretKey).mockRejectedValue(error)
    const cb = vi.fn()

    const result = await withSecretKey(ADDRESS, cb)

    expect(result.err && result.val).toBe(error)
    expect(passwordStore.clearPassword).toHaveBeenCalledOnce()
    expect(cb).not.toHaveBeenCalled()
  })
})
