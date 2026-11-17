import {
  addressEncodingFromCurve,
  addressFromPublicKey,
  getPublicKeyFromSecret,
  type KeypairCurve,
} from "@talismn/crypto"
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

// Paths that earlier versions of @talismn/crypto accepted and the parser now rejects, with the
// path whose key they derived: characters outside [A-Za-z0-9_] were skipped, and a Solana index
// was read with parseInt.
const STORED: [curve: KeypairCurve, storedPath: string, derivedPath: string][] = [
  ["sr25519", "//Alice-Bob", "//Alice"],
  ["ed25519", "//日本", ""],
  ["solana", "m/44'/501'/0abc'/0'", "m/44'/501'/0'/0'"],
]

/** A keyring as an earlier version stored it: each account derived from `derivedPath`. */
const storedKeyring = async () => {
  const keyring = Keyring.create()
  const { id: mnemonicId } = await keyring.addMnemonic(
    { name: "primary", mnemonic: PHRASE, confirmed: true },
    PASSWORD
  )
  for (const [curve, , derivedPath] of STORED)
    await keyring.addAccountDerive(
      { type: "existing-mnemonic", mnemonicId, curve, name: curve, derivationPath: derivedPath },
      PASSWORD
    )

  const data = keyring.toJson()
  for (const [index, [, storedPath]] of STORED.entries()) {
    const account = data.accounts[index]
    if (account?.type !== "keypair") throw new Error("expected a keypair account")
    account.derivationPath = storedPath
  }
  return { keyring: Keyring.load(data), mnemonicId }
}

const addressOfSecret = (secretKey: Uint8Array, curve: KeypairCurve) =>
  addressFromPublicKey(getPublicKeyFromSecret(secretKey, curve), addressEncodingFromCurve(curve))

describe("an account stored with a derivation path the parser now rejects", () => {
  it("loads with its stored path and decrypts the key of its own address", async () => {
    const { keyring } = await storedKeyring()

    for (const [curve, storedPath] of STORED) {
      const account = keyring.getAccounts().find((a) => a.name === curve)
      expect(account).toMatchObject({ type: "keypair", derivationPath: storedPath })
      const secretKey = await keyring.getAccountSecretKey(account!.address, PASSWORD)
      expect(addressOfSecret(secretKey, curve)).toBe(account!.address)
    }
  })

  it("can be renamed, exported and reloaded", async () => {
    const { keyring } = await storedKeyring()
    const [account] = keyring.getAccounts()
    keyring.updateAccount(account!.address, { name: "Renamed" })

    const exported = Keyring.load(await keyring.export(PASSWORD, "new-password"))
    expect(exported.getAccount(account!.address)).toMatchObject({
      name: "Renamed",
      derivationPath: "//Alice-Bob",
    })
    await expect(exported.getAccountSecretKey(account!.address, "new-password")).resolves.toEqual(
      await keyring.getAccountSecretKey(account!.address, PASSWORD)
    )
  })

  it("does not stop deriving other accounts from the same mnemonic", async () => {
    const { keyring, mnemonicId } = await storedKeyring()

    await keyring.addAccountDerive(
      {
        type: "existing-mnemonic",
        mnemonicId,
        curve: "sr25519",
        name: "new",
        derivationPath: "//0",
      },
      PASSWORD
    )
    expect(keyring.getAccounts()).toHaveLength(STORED.length + 1)
  })

  it("is found again by the path whose key it holds, and not added twice", async () => {
    const { keyring, mnemonicId } = await storedKeyring()
    const before = keyring.toJson()

    await expect(
      keyring.addAccountDerive(
        {
          type: "existing-mnemonic",
          mnemonicId,
          curve: "sr25519",
          name: "again",
          derivationPath: "//Alice",
        },
        PASSWORD
      )
    ).rejects.toThrow("Account already exists")
    expect(keyring.toJson()).toEqual(before)
  })

  it("can't be derived again from its stored path, which nothing in the keyring does", async () => {
    const { keyring, mnemonicId } = await storedKeyring()
    const before = keyring.toJson()

    await expect(
      keyring.getDerivedAddress(mnemonicId, "//Alice-Bob", "sr25519", PASSWORD)
    ).rejects.toThrow("Invalid derivation path")
    await expect(
      keyring.addAccountDerive(
        {
          type: "existing-mnemonic",
          mnemonicId,
          curve: "solana",
          name: "again",
          derivationPath: "m/44'/501'/0abc'/0'",
        },
        PASSWORD
      )
    ).rejects.toThrow("Invalid derivation path index")
    expect(keyring.toJson()).toEqual(before)
  })
})
