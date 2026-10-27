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

describe("Keyring.load validation", () => {
  const withAccount = (patch: Record<string, unknown>, index = 0) => {
    const data = fixture() as unknown as { accounts: Record<string, unknown>[] }
    data.accounts[index] = { ...data.accounts[index], ...patch }
    return data as unknown as KeyringStorage
  }
  const withMnemonic = (patch: Record<string, unknown>) => {
    const data = fixture() as unknown as { mnemonics: Record<string, unknown>[] }
    data.mnemonics[0] = { ...data.mnemonics[0], ...patch }
    return data as unknown as KeyringStorage
  }
  const load = (data: unknown) => () => Keyring.load(data as KeyringStorage)

  it("rejects wrong container types", () => {
    expect(load(null)).toThrow("Invalid data")
    expect(load({ passwordCheck: null, mnemonics: [], accounts: "x" })).toThrow("accounts")
    expect(load({ passwordCheck: null, mnemonics: {}, accounts: [] })).toThrow("mnemonics")
    expect(load({ passwordCheck: 12345, mnemonics: [], accounts: [] })).toThrow("passwordCheck")
    expect(load({ passwordCheck: 12345, mnemonics: [{ id: null }], accounts: [] })).toThrow()
  })

  it("accepts an empty keyring, with or without passwordCheck", () => {
    expect(Keyring.load({ passwordCheck: null, mnemonics: [], accounts: [] }).hasPassword()).toBe(
      false
    )
    expect(load({ mnemonics: [], accounts: [] })).not.toThrow()
  })

  it("rejects malformed mnemonics", () => {
    expect(load(withMnemonic({ id: "" }))).toThrow("mnemonics[0].id")
    expect(load(withMnemonic({ entropy: 42 }))).toThrow("mnemonics[0].entropy")
    expect(load(withMnemonic({ entropy: "not base64!" }))).toThrow("mnemonics[0].entropy")
    expect(load(withMnemonic({ confirmed: "yes" }))).toThrow("mnemonics[0].confirmed")

    const duplicate = fixture()
    duplicate.mnemonics.push(structuredClone(duplicate.mnemonics[0]!))
    expect(load(duplicate)).toThrow("mnemonics[1].id is a duplicate")
  })

  it("rejects malformed accounts", () => {
    expect(load(withAccount({ type: "???" }))).toThrow("accounts[0].type")
    expect(load(withAccount({ address: undefined }))).toThrow("accounts[0].address")
    expect(load(withAccount({ curve: "rsa" }))).toThrow("accounts[0].curve")
    expect(load(withAccount({ secretKey: undefined }))).toThrow("accounts[0].secretKey")
    expect(load(withAccount({ mnemonicId: 7 }))).toThrow("accounts[0].mnemonicId")
    expect(load(withAccount({ derivationPath: null }))).toThrow("accounts[0].derivationPath")

    const external = FIXTURE_STORAGE.accounts.findIndex((a) => a.type === "watch-only")
    expect(load(withAccount({ secretKey: "AAAA" }, external))).toThrow("secretKey")
    expect(load(withAccount({ mnemonicId: "x" }, external))).toThrow("mnemonicId")

    const ledger = FIXTURE_STORAGE.accounts.findIndex((a) => a.type === "ledger-polkadot")
    expect(load(withAccount({ curve: "sr25519" }, ledger))).toThrow(`accounts[${ledger}].curve`)
  })

  it("rejects two accounts with the same address", () => {
    const data = fixture()
    const ethereum = data.accounts.find((a) => a.address.startsWith("0x"))!
    // same address in lower case: getAccount could not tell them apart
    data.accounts.push({
      type: "watch-only",
      name: "Copy",
      address: ethereum.address.toLowerCase(),
      isPortfolio: false,
      createdAt: 0,
    })
    expect(load(data)).toThrow("is a duplicate")
  })

  it("rejects secrets without a passwordCheck", () => {
    expect(load({ ...fixture(), passwordCheck: null })).toThrow("passwordCheck is missing")
    expect(load({ ...fixture(), mnemonics: [], passwordCheck: null })).toThrow(
      "passwordCheck is missing"
    )
  })

  it("does not change the data it is given", () => {
    const data = fixture()
    const before = structuredClone(data)
    Keyring.load(data)
    expect(data).toEqual(before)
  })
})
