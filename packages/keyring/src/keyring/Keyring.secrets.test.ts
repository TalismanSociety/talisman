import { beforeEach, describe, expect, it, vi } from "vitest"
import { Keyring } from "./Keyring"

// every secret buffer the keyring obtains from @talismn/crypto or from decryption
const secrets = vi.hoisted(() => [] as Uint8Array[])
const record = <T extends Uint8Array>(bytes: T) => {
  secrets.push(bytes)
  return bytes
}

vi.mock("@talismn/crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@talismn/crypto")>()
  return {
    ...actual,
    // PBKDF2 at 100k iterations costs ~50ms per secret and is encryption.test's subject, not this one's
    pbkdf2: ((hash, entropy, salt, _iterations, length) =>
      actual.pbkdf2(hash, entropy, salt, 1, length)) satisfies typeof actual.pbkdf2,
    mnemonicToEntropy: ((mnemonic) =>
      record(actual.mnemonicToEntropy(mnemonic))) satisfies typeof actual.mnemonicToEntropy,
    entropyToSeed: (async (...args) =>
      record(await actual.entropyToSeed(...args))) satisfies typeof actual.entropyToSeed,
    deriveKeypair: ((...args) => {
      const pair = actual.deriveKeypair(...args)
      record(pair.secretKey)
      return pair
    }) satisfies typeof actual.deriveKeypair,
  }
})

vi.mock("./encryption", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./encryption")>()
  return {
    ...actual,
    decryptData: (async (...args) =>
      record(await actual.decryptData(...args))) satisfies typeof actual.decryptData,
  }
})

const PHRASE =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
const PASSWORD = "password"

const expectAllZeroed = () => {
  expect(secrets.length).toBeGreaterThan(0)
  for (const bytes of secrets) expect(bytes.every((b) => b === 0)).toBe(true)
}

let keyring: Keyring
let mnemonicId: string

describe("secret buffers", () => {
  beforeEach(async () => {
    keyring = Keyring.create()
    await keyring.initializePassword(PASSWORD)
    mnemonicId = (
      await keyring.addMnemonic({ name: "m", mnemonic: PHRASE, confirmed: true }, PASSWORD)
    ).id
    secrets.length = 0
  })

  it("are zeroed by addMnemonic", async () => {
    await keyring.addMnemonic(
      { name: "n", mnemonic: "zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong", confirmed: true },
      PASSWORD
    )
    expectAllZeroed()
  })

  it("are zeroed by addAccountDerive", async () => {
    await keyring.addAccountDerive(
      { type: "existing-mnemonic", mnemonicId, curve: "sr25519", name: "a", derivationPath: "//0" },
      PASSWORD
    )
    expectAllZeroed()
  })

  it("are zeroed by addAccountDerive when it throws", async () => {
    await expect(
      keyring.addAccountDerive(
        {
          type: "new-mnemonic",
          mnemonic: "zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong",
          mnemonicName: "n",
          confirmed: true,
          curve: "ed25519",
          name: "a",
          derivationPath: "/soft",
        },
        PASSWORD
      )
    ).rejects.toThrow()
    expectAllZeroed()
  })

  it("are zeroed by getDerivedAddress", async () => {
    await keyring.getDerivedAddress(mnemonicId, "m/44'/60'/0'/0/0", "ethereum", PASSWORD)
    expectAllZeroed()
  })

  it("are zeroed by getMnemonicText", async () => {
    expect(await keyring.getMnemonicText(mnemonicId, PASSWORD)).toBe(PHRASE)
    expectAllZeroed()
  })

  it("are zeroed by export", async () => {
    await keyring.addAccountDerive(
      { type: "existing-mnemonic", mnemonicId, curve: "sr25519", name: "a", derivationPath: "//0" },
      PASSWORD
    )
    secrets.length = 0
    await keyring.export(PASSWORD, "new-password")
    expectAllZeroed()
  })

  it("are left to the caller by getAccountSecretKey, which owns the returned key", async () => {
    const secretKey = new Uint8Array(32).fill(9)
    const { address } = await keyring.addAccountKeypair(
      { curve: "ecdsa", name: "k", secretKey },
      PASSWORD
    )
    expect(secretKey.every((b) => b === 9)).toBe(true)

    const decrypted = await keyring.getAccountSecretKey(address, PASSWORD)
    expect(decrypted).toEqual(secretKey)
  })
})
