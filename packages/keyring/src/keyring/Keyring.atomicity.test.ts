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

const PHRASE_A =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
const PHRASE_B = "zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong"
const PASSWORD = "correct-horse-battery-staple"

const seeded = async () => {
  const keyring = Keyring.create()
  await keyring.initializePassword(PASSWORD)
  const account = await keyring.addAccountDerive(
    {
      type: "new-mnemonic",
      mnemonicName: "primary",
      confirmed: true,
      mnemonic: PHRASE_A,
      curve: "sr25519",
      name: "Main",
      derivationPath: "//0",
    },
    PASSWORD
  )
  return { keyring, account, mnemonicId: account.type === "keypair" ? account.mnemonicId! : "" }
}

describe("a failed change leaves the keyring unchanged", () => {
  it("addAccountDerive does not keep the new mnemonic when the derivation throws", async () => {
    const { keyring } = await seeded()
    const before = keyring.toJson()

    await expect(
      keyring.addAccountDerive(
        {
          type: "new-mnemonic",
          mnemonicName: "second",
          confirmed: true,
          mnemonic: PHRASE_B,
          curve: "ed25519",
          name: "Second",
          derivationPath: "/soft",
        },
        PASSWORD
      )
    ).rejects.toThrow("Soft derivations are not supported")

    expect(keyring.toJson()).toEqual(before)
  })

  it("addAccountDerive does not keep the new mnemonic when the account exists", async () => {
    const { keyring } = await seeded()
    // PHRASE_B's //0 address, already present as a contact
    const derived = Keyring.create()
    const existing = await derived.addAccountDerive(
      {
        type: "new-mnemonic",
        mnemonicName: "x",
        confirmed: true,
        mnemonic: PHRASE_B,
        curve: "sr25519",
        name: "x",
        derivationPath: "//0",
      },
      PASSWORD
    )
    keyring.addAccountExternal({ type: "contact", name: "Contact", address: existing.address })
    const before = keyring.toJson()

    await expect(
      keyring.addAccountDerive(
        {
          type: "new-mnemonic",
          mnemonicName: "second",
          confirmed: true,
          mnemonic: PHRASE_B,
          curve: "sr25519",
          name: "Second",
          derivationPath: "//0",
        },
        PASSWORD
      )
    ).rejects.toThrow("Account already exists")

    expect(keyring.toJson()).toEqual(before)
  })

  it("a failed first change does not set the password", async () => {
    const keyring = Keyring.create()

    await expect(
      keyring.addAccountKeypair(
        { curve: "ecdsa", name: "Bad key", secretKey: new Uint8Array(3) },
        PASSWORD
      )
    ).rejects.toThrow()
    await expect(
      keyring.addAccountDerive(
        {
          type: "new-mnemonic",
          mnemonicName: "m",
          confirmed: true,
          mnemonic: PHRASE_A,
          curve: "ed25519",
          name: "x",
          derivationPath: "/soft",
        },
        PASSWORD
      )
    ).rejects.toThrow()

    expect(keyring.hasPassword()).toBe(false)
  })

  it("updateAccount applies nothing when one option is invalid", async () => {
    const keyring = Keyring.create()
    const address = "5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw"
    keyring.addAccountExternal({ type: "watch-only", name: "Before", address, isPortfolio: false })

    expect(() =>
      keyring.updateAccount(address, { name: "After", isPortfolio: "yes" as unknown as boolean })
    ).toThrow("isPortfolio must be a boolean")
    expect(keyring.getAccount(address)?.name).toBe("Before")
  })

  it("updateMnemonic applies nothing when one option is invalid", async () => {
    const { keyring, mnemonicId } = await seeded()

    expect(() =>
      keyring.updateMnemonic(mnemonicId, {
        name: "After",
        confirmed: "yes" as unknown as boolean,
      })
    ).toThrow("confirmed must be a boolean")
    expect(keyring.getMnemonic(mnemonicId)?.name).toBe("primary")
  })

  it("concurrent additions on one instance all land", async () => {
    const keyring = Keyring.create()
    const keys = [1, 2, 3, 4].map((n) => new Uint8Array(32).fill(n))

    // the extension adds imported keys with Promise.all on a keyring that may have no password yet
    const results = await Promise.allSettled([
      ...keys.map((secretKey) =>
        keyring.addAccountKeypair({ curve: "ecdsa", name: "k", secretKey }, PASSWORD)
      ),
      keyring.addAccountKeypair(
        { curve: "ecdsa", name: "bad", secretKey: new Uint8Array(3) },
        PASSWORD
      ),
    ])

    expect(results.map((r) => r.status)).toEqual([
      "fulfilled",
      "fulfilled",
      "fulfilled",
      "fulfilled",
      "rejected",
    ])
    expect(keyring.getAccounts()).toHaveLength(4)
    expect(await keyring.verifyPassword(PASSWORD)).toBe(true)
  })

  it("a concurrent change with another password is rejected", async () => {
    const keyring = Keyring.create()
    const results = await Promise.allSettled([
      keyring.addAccountKeypair(
        { curve: "ecdsa", name: "a", secretKey: new Uint8Array(32).fill(1) },
        PASSWORD
      ),
      keyring.addAccountKeypair(
        { curve: "ecdsa", name: "b", secretKey: new Uint8Array(32).fill(2) },
        "another-password"
      ),
    ])

    // whichever commits first sets the password, the other one fails its check against it
    expect(results.map((r) => r.status).sort()).toEqual(["fulfilled", "rejected"])
    expect(keyring.getAccounts()).toHaveLength(1)
    const [account] = keyring.getAccounts()
    const winner = account!.name === "a" ? PASSWORD : "another-password"
    expect(await keyring.verifyPassword(winner)).toBe(true)
    await expect(keyring.getAccountSecretKey(account!.address, winner)).resolves.toBeTruthy()
  })

  it("concurrent derivations from the same new mnemonic add it once", async () => {
    const keyring = Keyring.create()
    await keyring.initializePassword(PASSWORD)
    await Promise.all(
      ["//0", "//1"].map((derivationPath) =>
        keyring.addAccountDerive(
          {
            type: "new-mnemonic",
            mnemonicName: "m",
            confirmed: true,
            mnemonic: PHRASE_A,
            curve: "sr25519",
            name: derivationPath,
            derivationPath,
          },
          PASSWORD
        )
      )
    )

    expect(keyring.getMnemonics()).toHaveLength(1)
    expect(keyring.getAccounts()).toHaveLength(2)
  })
})

describe("accounts derived from a removed mnemonic", () => {
  it("stay in the keyring, keep their mnemonicId and their secret key", async () => {
    const { keyring, account, mnemonicId } = await seeded()
    keyring.removeMnemonic(mnemonicId)

    expect(keyring.getMnemonics()).toHaveLength(0)
    expect(keyring.getAccount(account.address)).toMatchObject({ mnemonicId })
    await expect(keyring.getAccountSecretKey(account.address, PASSWORD)).resolves.toHaveLength(64)
    expect(keyring.updateAccount(account.address, { name: "Renamed" }).name).toBe("Renamed")

    const reloaded = Keyring.load(keyring.toJson())
    expect(reloaded.getAccount(account.address)).toMatchObject({ mnemonicId })
  })

  it("make mnemonic lookups by that id throw without changing anything", async () => {
    const { keyring, mnemonicId } = await seeded()
    keyring.removeMnemonic(mnemonicId)
    const before = keyring.toJson()

    expect(() => keyring.updateMnemonic(mnemonicId, { name: "x" })).toThrow("Mnemonic not found")
    await expect(keyring.getMnemonicText(mnemonicId, PASSWORD)).rejects.toThrow(
      "Mnemonic not found"
    )
    await expect(keyring.getDerivedAddress(mnemonicId, "//1", "sr25519", PASSWORD)).rejects.toThrow(
      "Mnemonic not found"
    )
    await expect(
      keyring.addAccountDerive(
        {
          type: "existing-mnemonic",
          mnemonicId,
          curve: "sr25519",
          name: "x",
          derivationPath: "//1",
        },
        PASSWORD
      )
    ).rejects.toThrow("Mnemonic not found")

    expect(keyring.toJson()).toEqual(before)
  })

  it("are linked again when the same mnemonic is added again", async () => {
    const { keyring, mnemonicId } = await seeded()
    keyring.removeMnemonic(mnemonicId)

    const readded = await keyring.addMnemonic(
      { name: "re-imported", mnemonic: PHRASE_A, confirmed: true },
      PASSWORD
    )
    expect(readded.id).toBe(mnemonicId)
  })
})
