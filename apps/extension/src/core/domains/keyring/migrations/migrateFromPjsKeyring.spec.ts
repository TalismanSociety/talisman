import { deriveKeypair, entropyToSeed, mnemonicToEntropy } from "@talismn/crypto"
import { u8aToHex } from "@talismn/util"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import { getMessageSenderFn } from "../../../../../tests/core/util"
import Extension from "../../../handlers/Extension"
import { extensionStores } from "../../../handlers/stores"
import { mnemonicsStore } from "../../mnemonics/legacy/store.mnemonics"
import { encodePjsKeyringPairJson } from "../pjsKeystore"
import { keyringStore } from "../store"
import { migrateFromPjsKeyring } from "./migrateFromPjsKeyring"

// the keyring KDF (PBKDF2, 100k iterations) runs for every secret and is tested in @talismn/crypto
vi.mock("@talismn/crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@talismn/crypto")>()
  return {
    ...actual,
    pbkdf2: ((hash, entropy, salt, _iterations, length) =>
      actual.pbkdf2(hash, entropy, salt, 1, length)) satisfies typeof actual.pbkdf2,
  }
})

// scrypt at the pjs keystore params (N=2^17) takes about a second per account; pjsKeystore.spec
// covers the keystore itself. The setup files load @talismn/crypto before this mock registers,
// hence the module cache reset.
vi.hoisted(() => vi.resetModules())
vi.mock("@noble/hashes/scrypt.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@noble/hashes/scrypt.js")>()
  return {
    ...actual,
    scrypt: ((password, salt, opts) =>
      actual.scrypt(password, salt, { ...opts, N: 1 << 10 })) satisfies typeof actual.scrypt,
  }
})

vi.setConfig({ testTimeout: 60_000 })

const MNEMONIC = "seed sock milk update focus rotate barely fade car face mechanic mercy"

/**
 * Stores an account the way the polkadot-js keyring did, before the keyring migration: the
 * key derived at `keyPath` from the seed of the mnemonic with `seedPassword`, which is how
 * polkadot-js applies the password of a `///password` path.
 */
const addLegacyDerivedAccount = async (
  password: string,
  legacyMnemonicId: string,
  derivationPath: string,
  keyPath: string,
  seedPassword?: string
) => {
  const seed = await entropyToSeed(mnemonicToEntropy(MNEMONIC), "sr25519", seedPassword)
  const { address, publicKey, secretKey } = deriveKeypair(seed, keyPath, "sr25519")
  const json = encodePjsKeyringPairJson({ address, curve: "sr25519" }, secretKey, password)
  await chrome.storage.local.set({
    [`account:${u8aToHex(publicKey)}`]: {
      ...json,
      meta: {
        name: derivationPath,
        origin: "DERIVED",
        derivedMnemonicId: legacyMnemonicId,
        derivationPath,
      },
    },
  })
  return address
}

const derivedAddress = async (path: string) => {
  const seed = await entropyToSeed(mnemonicToEntropy(MNEMONIC), "sr25519")
  return deriveKeypair(seed, path, "sr25519").address
}

describe("migrateFromPjsKeyring", () => {
  let password: string

  beforeAll(async () => {
    await chrome.storage.local.clear()
    await keyringStore.reset()

    const messageSender = getMessageSenderFn(
      new Extension(extensionStores),
      chrome.runtime.connect("talismanTest")
    )
    await messageSender("pri(app.onboardCreatePassword)", {
      pass: "passw0rd",
      passConfirm: "passw0rd",
    })
    password = (await extensionStores.password.getPassword()) as string
  })

  afterAll(async () => {
    await chrome.storage.local.clear()
  })

  it("re-derives an account only when its path gives back its own address", async () => {
    const legacy = await mnemonicsStore.add("Legacy", MNEMONIC, password)
    const legacyMnemonicId = legacy.val as string

    // the path re-derives the account's key
    const matching = await addLegacyDerivedAccount(password, legacyMnemonicId, "//0", "//0")
    // a path that the parser rejects now
    const rejected = await addLegacyDerivedAccount(password, legacyMnemonicId, "//Alice-Bob", "//3")
    // a valid path that derives another key than the one the account holds
    const mismatched = await addLegacyDerivedAccount(password, legacyMnemonicId, "//1", "//2")
    // a password path, whose password polkadot-js applied to the seed
    const withPassword = await addLegacyDerivedAccount(
      password,
      legacyMnemonicId,
      "//hard///pw",
      "//hard",
      "pw"
    )

    expect(await migrateFromPjsKeyring.forward.apply({ password })).toBe(true)

    const mnemonicId = await keyringStore.getExistingMnemonicId(MNEMONIC)
    const accounts = await keyringStore.getAccounts()
    expect(accounts.map((a) => a.address).sort()).toEqual(
      [matching, rejected, mismatched, withPassword].sort()
    )

    expect(await keyringStore.getAccount(matching)).toMatchObject({
      type: "keypair",
      mnemonicId,
      derivationPath: "//0",
    })
    for (const address of [rejected, mismatched, withPassword]) {
      const account = await keyringStore.getAccount(address)
      expect(account?.type).toBe("keypair")
      expect(account).not.toHaveProperty("mnemonicId")
      expect(account).not.toHaveProperty("derivationPath")
    }

    // the paths that were not followed derive other accounts
    expect(accounts.map((a) => a.address)).not.toContain(await derivedAddress("//1"))
    expect(accounts.map((a) => a.address)).not.toContain(await derivedAddress("//Alice"))
    expect(accounts.map((a) => a.address)).not.toContain(await derivedAddress("//hard//pw"))
  })
})
