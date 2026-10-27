import { describe, expect, it, vi } from "vitest"
import { Keyring, type KeyringStorage } from "./Keyring"
import { FIXTURE_MNEMONIC, FIXTURE_PASSWORD, FIXTURE_STORAGE } from "./Keyring.fixture"

// the fixture's secrets are encrypted with PBKDF2 at 1 iteration
vi.mock("@talismn/crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@talismn/crypto")>()
  return {
    ...actual,
    pbkdf2: ((hash, entropy, salt, _iterations, length) =>
      actual.pbkdf2(hash, entropy, salt, 1, length)) satisfies typeof actual.pbkdf2,
  }
})

const fixture = () => structuredClone(FIXTURE_STORAGE) as unknown as KeyringStorage

describe("stored keyring compatibility", () => {
  it("loads a blob in the current storage format", async () => {
    const keyring = Keyring.load(fixture())

    expect(keyring.getMnemonics().map((m) => m.name)).toEqual(["Primary"])
    expect(keyring.getAccounts()).toHaveLength(FIXTURE_STORAGE.accounts.length)
    expect(await keyring.verifyPassword(FIXTURE_PASSWORD)).toBe(true)

    const [mnemonic] = keyring.getMnemonics()
    expect(await keyring.getMnemonicText(mnemonic!.id, FIXTURE_PASSWORD)).toBe(FIXTURE_MNEMONIC)
    expect(keyring.getExistingMnemonicId(FIXTURE_MNEMONIC)).toBe(mnemonic!.id)
  })

  it("decrypts every stored secret key", async () => {
    const keyring = Keyring.load(fixture())
    const keypairs = keyring.getAccounts().filter((a) => a.type === "keypair")
    expect(keypairs).toHaveLength(4)

    for (const account of keypairs) {
      const secretKey = await keyring.getAccountSecretKey(account.address, FIXTURE_PASSWORD)
      expect(secretKey.length).toBeGreaterThan(0)
    }
  })

  it("derives the stored address again from the stored mnemonic", async () => {
    const keyring = Keyring.load(fixture())
    const [mnemonic] = keyring.getMnemonics()
    const address = await keyring.getDerivedAddress(
      mnemonic!.id,
      "//0",
      "sr25519",
      FIXTURE_PASSWORD
    )
    expect(address).toBe(FIXTURE_STORAGE.accounts[0]!.address)
  })

  it("keeps fields it does not know about", () => {
    const keyring = Keyring.load(fixture())
    expect(keyring.getAccount("9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM")).toMatchObject({
      walletType: "solana",
      curve: "solana",
    })
    expect(keyring.getAccount("0x70997970C51812dc3A010C7d01b50e0d17dc79C8")).toMatchObject({
      derivationPath: "m/44'/60'/1'/0/0",
    })
  })

  it("defaults the curve of a ledger-polkadot account from before the curve field", () => {
    const keyring = Keyring.load(fixture())
    expect(keyring.getAccount("5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty")).toMatchObject({
      type: "ledger-polkadot",
      curve: "ed25519",
    })
  })

  it("round-trips through toJson", () => {
    const keyring = Keyring.load(fixture())
    const reloaded = Keyring.load(keyring.toJson())
    expect(reloaded.getAccounts()).toEqual(keyring.getAccounts())
    expect(reloaded.getMnemonics()).toEqual(keyring.getMnemonics())
  })

  it("updates and removes stored accounts", () => {
    const keyring = Keyring.load(fixture())
    for (const { address } of keyring.getAccounts()) {
      expect(keyring.updateAccount(address, { name: "Renamed" }).name).toBe("Renamed")
    }
    for (const { address } of keyring.getAccounts()) keyring.removeAccount(address)
    expect(keyring.getAccounts()).toHaveLength(0)
  })

  it("re-encrypts a stored blob under a new password", async () => {
    const keyring = Keyring.load(fixture())
    const exported = Keyring.load(await keyring.export(FIXTURE_PASSWORD, "new-password"))

    expect(await exported.verifyPassword("new-password")).toBe(true)
    const [mnemonic] = exported.getMnemonics()
    expect(await exported.getMnemonicText(mnemonic!.id, "new-password")).toBe(FIXTURE_MNEMONIC)
    for (const account of exported.getAccounts().filter((a) => a.type === "keypair")) {
      await expect(
        exported.getAccountSecretKey(account.address, "new-password")
      ).resolves.toBeInstanceOf(Uint8Array)
    }
  })
})
