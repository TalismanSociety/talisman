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
