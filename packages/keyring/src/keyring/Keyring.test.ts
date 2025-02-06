import {
  addressFromKeypair,
  deriveKeypair,
  entropyToSeed,
  KeypairCurve,
  mnemonicToEntropy,
} from "@talismn/crypto"

import { Keyring } from "./Keyring"

const MNEMONIC = {
  name: "test",
  description: "test",
  mnemonic: "test test test test test test test test test test test junk",
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

  it("rejects duplicate mnemonic", async () => {
    expect(() =>
      keyring.addMnemonic(
        {
          ...MNEMONIC,
          name: "duplicate",
        },
        VALID_PASSWORD,
      ),
    ).rejects.toThrow("Mnemonic already exists")
  })

  it("rejects invalid mnemonic", async () => {
    expect(() =>
      keyring.addMnemonic(
        {
          ...MNEMONIC,
          name: "duplicate",
          mnemonic: MNEMONIC.mnemonic.replace("junk", "test"),
        },
        VALID_PASSWORD,
      ),
    ).rejects.toThrow("Invalid mnemonic")
  })

  it("add account watch-only", async () => {
    keyring.addAccountExternal({
      type: "watch-only",
      address: "D85kXmhRyMQGC7jg59n523H7sb6ZBj3Mn3puusP2TshQLGx",
      name: "My contact",
      isPortfolio: true,
    })

    expect(keyring.getAccount("D85kXmhRyMQGC7jg59n523H7sb6ZBj3Mn3puusP2TshQLGx")).toBeTruthy()
  })

  it("add account contact", async () => {
    keyring.addAccountExternal({
      type: "contact",
      address: "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a",
      name: "My contact",
      networkId: "1",
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
})

const testAddFromSecret = async (curve: KeypairCurve, derivationPath: string) => {
  const entropy = mnemonicToEntropy(MNEMONIC.mnemonic)
  const seed = entropyToSeed(entropy, curve)
  const pair = deriveKeypair(seed, derivationPath, curve)
  const address = addressFromKeypair(pair)

  await keyring.addAccountKeypair(
    {
      curve,
      secretKey: pair.secretKey,
      name: "My account",
    },
    VALID_PASSWORD,
  )

  expect(keyring.getAccount(address)).toBeTruthy()
  expect(() => keyring.removeAccount(address)).not.toThrow()
  expect(keyring.getAccount(address)).toBeNull()
}

const testAddFromMnemonic = async (curve: KeypairCurve, derivationPath: string) => {
  const { address } = await keyring.addAccountDerive(
    {
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
