import {
  base58,
  deriveKeypair,
  entropyToSeed,
  KeypairCurve,
  mnemonicToEntropy,
} from "@talismn/crypto"

import { Keyring } from "./Keyring"

const MNEMONIC = {
  name: "test",
  mnemonic: "test test test test test test test test test test test junk",
  confirmed: true,
}
const DERIVATION_PATH_SUBSTRATE = "//Alice"
const DERIVATION_PATH_ETHEREUM = "m/44'/60'/0'/0/0"
const DERIVATION_PATH_SOLANA = "m/44'/501'/0'/0'"

const VALID_PASSWORD = " VALID_PASSWORD 😎 "
const WRONG_PASSWORD = " WRONG_PASSWORD 😡 "
const WRONG_PASSWORD_2 = VALID_PASSWORD.trim()

let keyring: Keyring
let mnemonicId: string

describe("keyring", () => {
  beforeAll(async () => {
    keyring = Keyring.create()

    const created = await keyring.addMnemonic(MNEMONIC, VALID_PASSWORD)
    mnemonicId = created.id

    expect("entropy" in created).toBeFalsy()
  })

  it("retrieve mnemonic text", async () => {
    const mnemonic = await keyring.getMnemonicText(mnemonicId, VALID_PASSWORD)
    expect(mnemonic).toEqual(MNEMONIC.mnemonic)
  })

  it("cannot retrieve mnemonic text with wrong password", () => {
    expect(() => keyring.getMnemonicText(mnemonicId, WRONG_PASSWORD)).rejects.toThrow(
      "Failed to decrypt data",
    )
    expect(() => keyring.getMnemonicText(mnemonicId, WRONG_PASSWORD_2)).rejects.toThrow(
      "Failed to decrypt data",
    )
  })

  it("cannot add an account with a wrong password", () => {
    expect(() =>
      keyring.addAccountDerive(
        {
          type: "existing-mnemonic",
          mnemonicId,
          curve: "ed25519",
          derivationPath: DERIVATION_PATH_SUBSTRATE,
          name: "My account",
        },
        WRONG_PASSWORD,
      ),
    ).rejects.toThrow("Invalid password")
  })

  it("rejects duplicate mnemonic", () => {
    return expect(() =>
      keyring.addMnemonic(
        {
          ...MNEMONIC,
          name: "duplicate",
          confirmed: false,
        },
        VALID_PASSWORD,
      ),
    ).rejects.toThrow("Mnemonic already exists")
  })

  it("rejects invalid mnemonic", () => {
    expect(() =>
      keyring.addMnemonic(
        {
          ...MNEMONIC,
          name: "duplicate",
          mnemonic: MNEMONIC.mnemonic.replace("junk", "test"),
          confirmed: false,
        },
        VALID_PASSWORD,
      ),
    ).rejects.toThrow("Invalid mnemonic")
  })

  it("add account watch-only", () => {
    keyring.addAccountExternal({
      type: "watch-only",
      address: "D85kXmhRyMQGC7jg59n523H7sb6ZBj3Mn3puusP2TshQLGx",
      name: "My contact",
      isPortfolio: true,
    })

    expect(keyring.getAccount("D85kXmhRyMQGC7jg59n523H7sb6ZBj3Mn3puusP2TshQLGx")).toBeTruthy()
  })

  it("add account contact", () => {
    keyring.addAccountExternal({
      type: "contact",
      address: "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a",
      name: "My contact",
      genesisHash: "0xdeadbeef",
    })

    expect(keyring.getAccount("0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a")).toBeTruthy()
  })

  it("add account ecdsa from secret", () => testAddFromSecret("ecdsa", DERIVATION_PATH_SUBSTRATE))
  it("add account ecdsa from mnemonic", () =>
    testAddFromMnemonic("ecdsa", DERIVATION_PATH_SUBSTRATE))

  it("add account sr25519 from secret", () =>
    testAddFromSecret("sr25519", DERIVATION_PATH_SUBSTRATE))
  it("add account sr25519 from mnemonic", () =>
    testAddFromMnemonic("sr25519", DERIVATION_PATH_SUBSTRATE))

  it("add account ed25519 from secret", () =>
    testAddFromSecret("ed25519", DERIVATION_PATH_SUBSTRATE))
  it("add account ed25519 from mnemonic", () =>
    testAddFromMnemonic("ed25519", DERIVATION_PATH_SUBSTRATE))

  it("add account ethereum from secret", () =>
    testAddFromSecret("ethereum", DERIVATION_PATH_ETHEREUM))
  it("add account ethereum from mnemonic", () =>
    testAddFromMnemonic("ethereum", DERIVATION_PATH_ETHEREUM))

  it("add account solana from secret", () => testAddFromSecret("solana", DERIVATION_PATH_SOLANA))
  it("add account solana from mnemonic", () =>
    testAddFromMnemonic("solana", DERIVATION_PATH_SOLANA))

  it("can export", async () => {
    const derived = await keyring.addAccountDerive(
      {
        type: "existing-mnemonic",
        mnemonicId,
        curve: "ed25519",
        derivationPath: DERIVATION_PATH_SUBSTRATE,
        name: "My account",
      },
      VALID_PASSWORD,
    )

    const restored = Keyring.load(keyring.toJson())

    expect(JSON.stringify(restored.getAccounts())).toEqual(JSON.stringify(keyring.getAccounts()))

    const restoredMnemonic = await restored.getMnemonicText(mnemonicId, VALID_PASSWORD)
    expect(restoredMnemonic).toEqual(MNEMONIC.mnemonic)

    const originalSecret = await keyring.getAccountSecretKey(derived.address, VALID_PASSWORD)
    const restoredSecret = await restored.getAccountSecretKey(derived.address, VALID_PASSWORD)

    expect(base58.encode(originalSecret)).toEqual(base58.encode(restoredSecret))
  })
})

const testAddFromSecret = async (curve: KeypairCurve, derivationPath: string) => {
  const entropy = mnemonicToEntropy(MNEMONIC.mnemonic)
  const seed = await entropyToSeed(entropy, curve)
  const pair = deriveKeypair(seed, derivationPath, curve)

  await keyring.addAccountKeypair(
    {
      curve,
      secretKey: pair.secretKey,
      name: "My account",
    },
    VALID_PASSWORD,
  )

  expect(keyring.getAccount(pair.address)).toBeTruthy()
  expect(() => keyring.removeAccount(pair.address)).not.toThrow()
  expect(keyring.getAccount(pair.address)).toBeNull()
}

const testAddFromMnemonic = async (curve: KeypairCurve, derivationPath: string) => {
  const { address } = await keyring.addAccountDerive(
    {
      type: "existing-mnemonic",
      mnemonicId,
      curve,
      derivationPath,
      name: "My account",
    },
    VALID_PASSWORD,
  )

  expect(keyring.getAccount(address)).toBeTruthy()
  expect(() => keyring.removeAccount(address)).not.toThrow()
  expect(keyring.getAccount(address)).toBeNull()
}
