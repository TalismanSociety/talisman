import { deriveBitcoinAddressFromXpub, encodeP2wpkhAddress, normalizeXpub } from "@talismn/crypto"
import { beforeAll, describe, expect, it } from "vitest"
import { Keyring } from "./Keyring"

// official BIP84/BIP86 test vectors mnemonic
const MNEMONIC = {
  name: "bip test",
  mnemonic:
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
  confirmed: true,
}

const BIP84_ACCOUNT0_ZPUB =
  "zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs"
const BIP86_ACCOUNT0_XPUB =
  "xpub6BgBgsespWvERF3LHQu6CnqdvfEvtMcQjYrcRzx53QJjSxarj2afYWcLteoGVky7D3UKDP9QyrLprQ3VCECoY49yfdDEHGCtMMj92pReUsQ"
const BIP84_ADDRESS_0_0 = "bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu"
const BIP84_ADDRESS_1_0 = "bc1q8c6fshw2dlwun7ekn9qwf37cu2rn755upcp6el"

const PASSWORD = "password"

let keyring: Keyring
let mnemonicId: string

describe("keyring bitcoin accounts", () => {
  beforeAll(async () => {
    keyring = Keyring.create()
    const created = await keyring.addMnemonic(MNEMONIC, PASSWORD)
    mnemonicId = created.id
  })

  it("adds an HD bitcoin account matching BIP84/BIP86 vectors", async () => {
    const account = await keyring.addAccountBitcoin(
      { type: "existing-mnemonic", mnemonicId, name: "BTC 1" },
      PASSWORD
    )

    if (account.type !== "hd-bitcoin") throw new Error("wrong account type")
    expect(account.accountIndex).toEqual(0)
    expect(account.masterFingerprint).toEqual("0x73c5da0a")
    expect(account.address).toEqual(normalizeXpub(BIP84_ACCOUNT0_ZPUB))
    expect(account.keys.payments.xpub).toEqual(normalizeXpub(BIP84_ACCOUNT0_ZPUB))
    expect(account.keys.ordinals.xpub).toEqual(BIP86_ACCOUNT0_XPUB)
    expect(account.keys.payments.derivationPath).toEqual("m/84'/0'/0'")
    expect(account.keys.ordinals.derivationPath).toEqual("m/86'/0'/0'")
  })

  it("rejects a duplicate bitcoin account", async () => {
    await expect(() =>
      keyring.addAccountBitcoin(
        { type: "existing-mnemonic", mnemonicId, name: "BTC dup", accountIndex: 0 },
        PASSWORD
      )
    ).rejects.toThrow("Account already exists")
  })

  it("auto-increments the account index", async () => {
    const account = await keyring.addAccountBitcoin(
      { type: "existing-mnemonic", mnemonicId, name: "BTC 2" },
      PASSWORD
    )
    if (account.type !== "hd-bitcoin") throw new Error("wrong account type")
    expect(account.accountIndex).toEqual(1)
    expect(account.address).not.toEqual(normalizeXpub(BIP84_ACCOUNT0_ZPUB))
  })

  it("derives signing keys matching the stored xpub", async () => {
    const address = normalizeXpub(BIP84_ACCOUNT0_ZPUB)

    await keyring.withBitcoinAccountKeys(
      address,
      [
        { tree: "payments", change: 0, index: 0 },
        { tree: "payments", change: 1, index: 0 },
      ],
      PASSWORD,
      (keys) => {
        expect(keys).toHaveLength(2)
        expect(encodeP2wpkhAddress(keys[0].publicKey)).toEqual(BIP84_ADDRESS_0_0)
        expect(encodeP2wpkhAddress(keys[1].publicKey)).toEqual(BIP84_ADDRESS_1_0)
        // consistency with public-only derivation from the account xpub
        expect(encodeP2wpkhAddress(keys[0].publicKey)).toEqual(
          deriveBitcoinAddressFromXpub(address, "p2wpkh", 0, 0)
        )
      }
    )
  })

  it("zeroes secret keys after the callback", async () => {
    const address = normalizeXpub(BIP84_ACCOUNT0_ZPUB)
    let captured: Uint8Array | undefined

    await keyring.withBitcoinAccountKeys(
      address,
      [{ tree: "payments", change: 0, index: 0 }],
      PASSWORD,
      (keys) => {
        captured = keys[0].secretKey
        expect(captured.some((b) => b !== 0)).toBe(true)
      }
    )

    expect(captured?.every((b) => b === 0)).toBe(true)
  })

  it("refuses non-hd accounts", async () => {
    await expect(() =>
      keyring.withBitcoinAccountKeys(
        "bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu",
        [{ tree: "payments", change: 0, index: 0 }],
        PASSWORD,
        () => undefined
      )
    ).rejects.toThrow("Account not found")
  })

  it("adds external ledger-bitcoin and watch-only-bitcoin accounts keyed by xpub", () => {
    const ledger = keyring.addAccountExternal({
      type: "ledger-bitcoin",
      name: "Ledger BTC",
      address: BIP86_ACCOUNT0_XPUB, // any unused xpub works as identity for this test
      accountIndex: 0,
      masterFingerprint: "0x73c5da0a",
      keys: {
        payments: { derivationPath: "m/84'/0'/0'", xpub: BIP86_ACCOUNT0_XPUB },
        ordinals: { derivationPath: "m/86'/0'/0'", xpub: BIP86_ACCOUNT0_XPUB },
      },
    })
    expect(ledger.type).toEqual("ledger-bitcoin")
    expect(ledger.address).toEqual(BIP86_ACCOUNT0_XPUB)

    // watch-only from a SLIP-132 zpub of another account: normalized on storage
    const account1Zpub = keyring
      .getAccounts()
      .find((a) => a.type === "hd-bitcoin" && a.accountIndex === 1)
    if (account1Zpub?.type !== "hd-bitcoin") throw new Error("missing account")

    expect(() =>
      keyring.addAccountExternal({
        type: "watch-only-bitcoin",
        name: "Watched dup",
        address: account1Zpub.keys.payments.xpub,
        isPortfolio: true,
        addressType: "p2wpkh",
      })
    ).toThrow("Account already exists")
  })
})
