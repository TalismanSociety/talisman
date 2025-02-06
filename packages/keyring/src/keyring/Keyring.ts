import { blake3 } from "@noble/hashes/blake3"
import {
  addressEncodingFromCurve,
  addressFromPublicKey,
  deriveKeypair,
  entropyToMnemonic,
  entropyToSeed,
  getPublicKeyFromSecret,
  isAddressEqual,
  isValidMnemonic,
  mnemonicToEntropy,
  normalizeAddress,
} from "@talismn/crypto"

import type { Account, Mnemonic } from "../types"
import type {
  AddAccountDeriveOptions,
  AddAccountExternalOptions,
  AddAccountKeypairOptions,
  AddMnemonicOptions,
} from "../types/keyring"
import type { AccountStorage, MnemonicStorage } from "./types"
import { isAccountExternal } from "../types"
import { changeEncryptedDataPassword, decryptData, encryptData } from "./encryption"

// Never change this or it would break existing passwords
// const PASSWORD_CHECK_PHRASE =
//   "This is the phrase to encrypt with the password used to verify that the password is the expected one";

type KeyringStorage = {
  // passwordCheck: string // PASSWORD_CHECK_PHRASE encrypted with user password
  mnemonics: MnemonicStorage[]
  accounts: AccountStorage[]
}

export class Keyring {
  #storage: KeyringStorage

  private constructor(data: KeyringStorage) {
    this.#storage = data
  }

  public static create(): Keyring {
    return new Keyring({
      mnemonics: [],
      accounts: [],
    })
  }

  public static load(json: string): Keyring {
    return new Keyring(JSON.parse(json))
  }

  public toString(): string {
    return JSON.stringify(this.#storage)
  }

  public async export(password: string, newPassword: string): Promise<string> {
    const keyring = new Keyring(structuredClone(this.#storage))

    for (const mnemonic of keyring.#storage.mnemonics)
      mnemonic.entropy = await changeEncryptedDataPassword(mnemonic.entropy, password, newPassword)

    for (const account of keyring.#storage.accounts)
      if (account.type === "keypair")
        account.secretKey = await changeEncryptedDataPassword(
          account.secretKey,
          password,
          newPassword,
        )

    return keyring.toString()
  }

  public getMnemonics(): Mnemonic[] {
    return this.#storage.mnemonics.map(mnemonicFromStorage)
  }

  public async addMnemonic(
    { name, description, mnemonic }: AddMnemonicOptions,
    password: string,
  ): Promise<Mnemonic> {
    if (!name) throw new Error("Name is required")
    if (!isValidMnemonic(mnemonic)) throw new Error("Invalid mnemonic")

    const entropy = mnemonicToEntropy(mnemonic)

    // id is a hash of the seed, helps us prevent having duplicates and allows automatic remapping of accounts/seeds if seeds are deleted then re-added
    const id = hashBlake3Base64(entropy)

    if (this.#storage.mnemonics.find((s) => s.id === id)) throw new Error("Mnemonic already exists")

    const storage: MnemonicStorage = {
      id,
      name,
      description,
      entropy: await encryptData(entropy, password),
      createdAt: Date.now(),
    }

    this.#storage.mnemonics.push(storage)

    return mnemonicFromStorage(storage)
  }

  public getMnemonic(id: string): Mnemonic | null {
    const mnemonic = this.#storage.mnemonics.find((s) => s.id === id)
    return mnemonic ? mnemonicFromStorage(mnemonic) : null
  }

  public updateMnemonic(id: string, name: string, description: string) {
    const mnemonic = this.#storage.mnemonics.find((s) => s.id === id)
    if (!mnemonic) throw new Error("Mnemonic not found")
    if (!name) throw new Error("Name is required")
    mnemonic.name = name
    mnemonic.description = description
  }

  async getMnemonicText(id: string, password: string): Promise<string> {
    const mnemonic = this.#storage.mnemonics.find((s) => s.id === id)
    if (!mnemonic) throw new Error("Mnemonic not found")

    const entropy = await decryptData(mnemonic.entropy, password)

    return entropyToMnemonic(entropy)
  }

  public getAccounts(): Account[] {
    return this.#storage.accounts.map(accountFromStorage)
  }

  public getAccount(address: string): Account | null {
    const account = this.#storage.accounts.find((s) => isAddressEqual(s.address, address))
    return account ? accountFromStorage(account) : null
  }

  public removeAccount(address: string) {
    const index = this.#storage.accounts.findIndex((s) => isAddressEqual(s.address, address))
    if (index === -1) throw new Error("Account not found")
    this.#storage.accounts.splice(index, 1)
  }

  public addAccountExternal(options: AddAccountExternalOptions): Account {
    const address = normalizeAddress(options.address)

    if (this.getAccount(address)) throw new Error("Account already exists")

    const account: AccountStorage = {
      ...options,
      address,
      createdAt: Date.now(),
    }

    if (!isAccountExternal(account)) throw new Error("Invalid account type")

    this.#storage.accounts.push(account)

    return accountFromStorage(account)
  }

  public async addAccountDerive(
    { curve, mnemonicId, derivationPath, name, description }: AddAccountDeriveOptions,
    password: string,
  ): Promise<Account> {
    const mnemonic = this.#storage.mnemonics.find((s) => s.id === mnemonicId)
    if (!mnemonic) throw new Error("Mnemonic not found")

    const entropy = await decryptData(mnemonic.entropy, password)
    const seed = entropyToSeed(entropy, curve)
    const pair = deriveKeypair(seed, derivationPath, curve)

    if (this.getAccount(pair.address)) throw new Error("Account already exists")

    const account: AccountStorage = {
      type: "keypair",
      curve,
      name,
      description,
      address: normalizeAddress(pair.address),
      secretKey: await encryptData(pair.secretKey, password),
      createdAt: Date.now(),
    }

    this.#storage.accounts.push(account)

    return accountFromStorage(account)
  }

  public async addAccountKeypair(
    { curve, name, description, secretKey }: AddAccountKeypairOptions,
    password: string,
  ): Promise<Account> {
    const publicKey = getPublicKeyFromSecret(secretKey, curve)
    const encoding = addressEncodingFromCurve(curve)
    const address = addressFromPublicKey(publicKey, encoding)

    if (this.getAccount(address)) throw new Error("Account already exists")

    const account: AccountStorage = {
      type: "keypair",
      curve,
      name,
      description,
      address: normalizeAddress(address),
      secretKey: await encryptData(secretKey, password),
      createdAt: Date.now(),
    }

    this.#storage.accounts.push(account)

    return accountFromStorage(account)
  }

  public async getAccountSecretKey(address: string, password: string): Promise<Uint8Array> {
    const account = this.#storage.accounts.find((a) => a.address === normalizeAddress(address))
    if (!account) throw new Error("Account not found")
    if (account.type !== "keypair") throw new Error("Account is not a keypair")

    const secretKey = await decryptData(account.secretKey, password)
    return secretKey
  }
}

// FAF cryptographic hashing function, outputs 44 characters
const hashBlake3Base64 = (input: Uint8Array) => {
  return btoa(String.fromCharCode(...blake3(input)))
}

const mnemonicFromStorage = (data: MnemonicStorage): Mnemonic => {
  const copy = structuredClone(data) as Mnemonic
  if ("entropy" in copy) delete copy.entropy
  return copy
}

const accountFromStorage = (data: AccountStorage): Account => {
  const copy = structuredClone(data) as Account
  if ("secretKey" in copy) delete copy.secretKey
  return copy
}
