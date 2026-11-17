import { describe, expect, it, vi } from "vitest"
import { Keyring } from "./Keyring"

// PBKDF2 at 100k iterations costs ~50ms per secret and is encryption.test's subject, not this one's
vi.mock("@talismn/crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@talismn/crypto")>()
  return {
    ...actual,
    pbkdf2: ((hash, entropy, salt, _iterations, length) =>
      actual.pbkdf2(hash, entropy, salt, 1, length)) satisfies typeof actual.pbkdf2,
  }
})

const PHRASE =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
const PASSWORD = "correct-horse-battery-staple"
const ADDRESS = "5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw"

const withMnemonic = async () => {
  const keyring = Keyring.create()
  await keyring.initializePassword(PASSWORD)
  const { id } = await keyring.addMnemonic(
    { name: "primary", mnemonic: PHRASE, confirmed: false },
    PASSWORD
  )
  return { keyring, mnemonicId: id }
}

describe("updateAccount", () => {
  it("applies nothing when one option is invalid", () => {
    const keyring = Keyring.create()
    keyring.addAccountExternal({
      type: "watch-only",
      name: "Before",
      address: ADDRESS,
      isPortfolio: false,
    })

    expect(() =>
      keyring.updateAccount(ADDRESS, { name: "After", isPortfolio: "yes" as unknown as boolean })
    ).toThrow("isPortfolio must be a boolean")
    expect(keyring.getAccount(ADDRESS)).toMatchObject({ name: "Before", isPortfolio: false })
  })

  it("keeps a contact's name and network when the genesis hash is invalid", () => {
    const genesisHash = `0x${"11".repeat(32)}` as const
    const keyring = Keyring.create()
    keyring.addAccountExternal({ type: "contact", name: "Before", address: ADDRESS, genesisHash })

    expect(() =>
      keyring.updateAccount(ADDRESS, {
        name: "After",
        genesisHash: "not hex" as unknown as `0x${string}`,
      })
    ).toThrow("genesisHash must be a hex string")
    expect(keyring.getAccount(ADDRESS)).toMatchObject({ name: "Before", genesisHash })
  })

  it("applies every option when all are valid", () => {
    const keyring = Keyring.create()
    keyring.addAccountExternal({
      type: "watch-only",
      name: "Before",
      address: ADDRESS,
      isPortfolio: false,
    })

    keyring.updateAccount(ADDRESS, { name: "After", isPortfolio: true })
    expect(keyring.getAccount(ADDRESS)).toMatchObject({ name: "After", isPortfolio: true })
  })
})

describe("updateMnemonic", () => {
  it("applies nothing when one option is invalid", async () => {
    const { keyring, mnemonicId } = await withMnemonic()

    expect(() =>
      keyring.updateMnemonic(mnemonicId, {
        name: "After",
        confirmed: "yes" as unknown as boolean,
      })
    ).toThrow("confirmed must be a boolean")
    expect(keyring.getMnemonic(mnemonicId)).toMatchObject({ name: "primary", confirmed: false })
  })
})

describe("concurrent additions of one account on one instance", () => {
  it("addAccountKeypair adds it once", async () => {
    const keyring = Keyring.create()
    await keyring.initializePassword(PASSWORD)
    const secretKey = new Uint8Array(32).fill(7)

    const results = await Promise.allSettled([
      keyring.addAccountKeypair({ curve: "ethereum", name: "a", secretKey }, PASSWORD),
      keyring.addAccountKeypair({ curve: "ethereum", name: "b", secretKey }, PASSWORD),
    ])

    expect(results.map((r) => r.status).sort()).toEqual(["fulfilled", "rejected"])
    expect(results.find((r) => r.status === "rejected")).toMatchObject({
      reason: new Error("Account already exists"),
    })
    expect(keyring.getAccounts()).toHaveLength(1)
  })

  it("addAccountDerive adds it once", async () => {
    const { keyring, mnemonicId } = await withMnemonic()
    const derive = (name: string) =>
      keyring.addAccountDerive(
        { type: "existing-mnemonic", mnemonicId, curve: "sr25519", name, derivationPath: "//0" },
        PASSWORD
      )

    const results = await Promise.allSettled([derive("a"), derive("b")])

    expect(results.map((r) => r.status).sort()).toEqual(["fulfilled", "rejected"])
    expect(keyring.getAccounts()).toHaveLength(1)
  })
})
