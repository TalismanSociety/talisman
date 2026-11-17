import { beforeEach, describe, expect, it, vi } from "vitest"
import { Keyring } from "./Keyring"

// every secret buffer the keyring obtains from @talismn/crypto or from decryption, and whether
// it held a non-zero byte when the keyring got it (a zero buffer would pass the check vacuously)
const secrets = vi.hoisted(() => [] as { bytes: Uint8Array; nonZero: boolean }[])
const record = <T extends Uint8Array>(bytes: T) => {
  secrets.push({ bytes, nonZero: bytes.some((b) => b !== 0) })
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

// both phrases have non-zero entropy ("abandon … about" encodes 16 zero bytes)
const PHRASE = "legal winner thank year wave sausage worth useful legal winner thank yellow"
const OTHER_PHRASE = "zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong"
const PASSWORD = "password"

const expectAllZeroed = () => {
  expect(secrets.length).toBeGreaterThan(0)
  for (const { bytes, nonZero } of secrets) {
    expect(nonZero).toBe(true)
    expect(bytes.every((b) => b === 0)).toBe(true)
  }
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
    await keyring.addMnemonic({ name: "n", mnemonic: OTHER_PHRASE, confirmed: true }, PASSWORD)
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
          mnemonic: OTHER_PHRASE,
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
    // this records the password check; changeEncryptedDataPassword decrypts each secret internally
    // and zeroes it, which encryption.test covers
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
