import { describe, expect, it, vi } from "vitest"
import type { AddAccountExternalOptions } from "../types"
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

const PASSWORD = "password"
const ETHEREUM = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
// Alice, encoded with the Polkadot prefix (0) and the generic one (42)
const ALICE_POLKADOT = "15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5"
const ALICE_GENERIC = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"

const external = (options: unknown) => options as AddAccountExternalOptions

describe("address lookups", () => {
  it("match an address in any encoding, in every method", async () => {
    const keyring = Keyring.create()
    keyring.addAccountExternal({ type: "contact", name: "Alice", address: ALICE_GENERIC })
    const keypair = await keyring.addAccountKeypair(
      { curve: "ethereum", name: "Key", secretKey: new Uint8Array(32).fill(1) },
      PASSWORD
    )

    expect(keyring.getAccount(ALICE_POLKADOT)?.address).toBe(ALICE_GENERIC)
    expect(keyring.updateAccount(ALICE_POLKADOT, { name: "Renamed" }).name).toBe("Renamed")
    await expect(
      keyring.getAccountSecretKey(keypair.address.toLowerCase(), PASSWORD)
    ).resolves.toHaveLength(32)
    keyring.removeAccount(ALICE_POLKADOT)
    expect(keyring.getAccount(ALICE_GENERIC)).toBeNull()
  })

  it("report an unknown or invalid address as not found", async () => {
    const keyring = Keyring.create()
    expect(() => keyring.updateAccount("not an address", { name: "x" })).toThrow(
      "Account not found"
    )
    expect(() => keyring.getAccountSecretKey("not an address", PASSWORD)).toThrow(
      "Account not found"
    )
  })
})

describe("addAccountExternal", () => {
  it("stores the account under its normalised address", () => {
    const keyring = Keyring.create()
    const account = keyring.addAccountExternal({
      type: "watch-only",
      name: "Watched",
      address: ETHEREUM.toLowerCase(),
      isPortfolio: true,
    })
    expect(account.address).toBe(ETHEREUM)
  })

  it("rejects fields that only keypair accounts carry", () => {
    const keyring = Keyring.create()
    const base = { type: "watch-only", name: "W", address: ETHEREUM, isPortfolio: true }

    expect(() => keyring.addAccountExternal(external({ ...base, secretKey: "AAAA" }))).toThrow(
      "secretKey is not allowed"
    )
    expect(() => keyring.addAccountExternal(external({ ...base, mnemonicId: "id" }))).toThrow(
      "mnemonicId is not allowed"
    )
    expect(keyring.getAccounts()).toHaveLength(0)
  })

  it("rejects keypair and unknown types", () => {
    const keyring = Keyring.create()
    for (const type of ["keypair", "???", undefined])
      expect(() =>
        keyring.addAccountExternal(external({ type, name: "x", address: ETHEREUM }))
      ).toThrow("Invalid account type")
  })

  it("checks the fields of the account's type", () => {
    const keyring = Keyring.create()
    const cases: Record<string, unknown>[] = [
      { type: "contact", genesisHash: "deadbeef" },
      { type: "watch-only", isPortfolio: "yes" },
      { type: "ledger-polkadot", curve: "sr25519", app: "Polkadot" },
      { type: "ledger-polkadot", curve: "ed25519", accountIndex: -1 },
      { type: "ledger-ethereum", derivationPath: 44 },
      { type: "signet", genesisHash: "0x00", url: 1 },
    ]
    for (const fields of cases)
      expect(() =>
        keyring.addAccountExternal(external({ name: "x", address: ETHEREUM, ...fields }))
      ).toThrow("Invalid")
    expect(() =>
      keyring.addAccountExternal(external({ type: "contact", name: 1, address: ETHEREUM }))
    ).toThrow("name is required")
    expect(keyring.getAccounts()).toHaveLength(0)
  })

  it("keeps fields the callers add, and accepts the fields they leave out", () => {
    const keyring = Keyring.create()
    // the mobile app adds walletType and curve to watched accounts
    const watched = keyring.addAccountExternal(
      external({
        type: "watch-only",
        name: "Watched",
        address: ETHEREUM,
        isPortfolio: false,
        walletType: "ethereum",
        curve: "ethereum",
      })
    )
    expect(watched).toMatchObject({ walletType: "ethereum", curve: "ethereum" })

    // the polkadot.js keyring migration can leave out a Ledger's path or a Signet's url
    expect(() =>
      keyring.addAccountExternal(
        external({
          type: "ledger-ethereum",
          name: "Ledger",
          address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        })
      )
    ).not.toThrow()
    expect(() =>
      keyring.addAccountExternal(external({ type: "signet", name: "S", address: ALICE_GENERIC }))
    ).not.toThrow()
  })
})
