import { blake3 } from "@noble/hashes/blake3"
import {
  addressEncodingFromCurve,
  addressFromPublicKey,
  bytesToString,
  deriveKeypair,
  entropyToMnemonic,
  entropyToSeed,
  getPublicKeyFromSecret,
  isAddressEqual,
  isValidMnemonic,
  KeypairCurve,
  mnemonicToEntropy,
  normalizeAddress,
} from "@talismn/crypto"

import type { Account, Mnemonic } from "../types"
import type {
  AddAccountDeriveOptions,
  AddAccountExternalOptions,
  AddAccountKeypairOptions,
  AddMnemonicOptions,
  UpdateAccountOptions,
  UpdateMnemonicOptions,
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

  protected constructor(data: KeyringStorage) {
    this.#storage = data
  }

  public static create(): Keyring {
    return new Keyring({
      mnemonics: [],
      accounts: [],
    })
  }

  public static load(json: string): Keyring {
    const data = JSON.parse(json)
    // TODO: schema check ?
    if (!data.accounts || !data.mnemonics) throw new Error("Invalid data")
    return new Keyring(data)
  }

  public toString(pretty?: boolean): string {
    return JSON.stringify(this.#storage, undefined, pretty ? 2 : undefined)
  }

  public async export(password: string, jsonPassword: string, pretty?: boolean): Promise<string> {
    const keyring = new Keyring(structuredClone(this.#storage))

    for (const mnemonic of keyring.#storage.mnemonics)
      mnemonic.entropy = await changeEncryptedDataPassword(mnemonic.entropy, password, jsonPassword)

    for (const account of keyring.#storage.accounts)
      if (account.type === "keypair")
        account.secretKey = await changeEncryptedDataPassword(
          account.secretKey,
          password,
          jsonPassword,
        )

    return keyring.toString(pretty)
  }

  public getMnemonics(): Mnemonic[] {
    return this.#storage.mnemonics.map(mnemonicFromStorage)
  }

  public async addMnemonic(
    { name, mnemonic, confirmed }: AddMnemonicOptions,
    password: string,
  ): Promise<Mnemonic> {
    if (!name) throw new Error("Name is required")
    if (!isValidMnemonic(mnemonic)) throw new Error("Invalid mnemonic")

    const entropy = mnemonicToEntropy(mnemonic)

    // id is a hash of the seed, helps us prevent having duplicates and allows automatic remapping of accounts/seeds if seeds are deleted then re-added
    const id = getMnemonicId(entropy)

    if (this.#storage.mnemonics.find((s) => s.id === id)) throw new Error("Mnemonic already exists")

    const storage: MnemonicStorage = {
      id,
      name,
      entropy: await encryptData(entropy, password),
      confirmed,
      createdAt: Date.now(),
    }

    this.#storage.mnemonics.push(storage)

    return mnemonicFromStorage(storage)
  }

  public getMnemonic(id: string): Mnemonic | null {
    const mnemonic = this.#storage.mnemonics.find((s) => s.id === id)
    return mnemonic ? mnemonicFromStorage(mnemonic) : null
  }

  public updateMnemonic(id: string, { name, confirmed }: UpdateMnemonicOptions) {
    const mnemonic = this.#storage.mnemonics.find((s) => s.id === id)
    if (!mnemonic) throw new Error("Mnemonic not found")
    if (name !== undefined) mnemonic.name = name
    if (confirmed !== undefined) mnemonic.confirmed = confirmed
    return mnemonicFromStorage(mnemonic)
  }

  public removeMnemonic(id: string) {
    const index = this.#storage.mnemonics.findIndex((mnemonic) => mnemonic.id == id)
    if (index === -1) throw new Error("Mnemonic not found")
    this.#storage.mnemonics.splice(index, 1)
  }

  async getMnemonicText(id: string, password: string): Promise<string> {
    const mnemonic = this.#storage.mnemonics.find((s) => s.id === id)
    if (!mnemonic) throw new Error("Mnemonic not found")

    const entropy = await decryptData(mnemonic.entropy, password)

    return entropyToMnemonic(entropy)
  }

  public getExistingMnemonicId(mnemonic: string): string | null {
    const entropy = mnemonicToEntropy(mnemonic)
    const mnemonicId = getMnemonicId(entropy)
    return this.#storage.mnemonics.some((s) => s.id === mnemonicId) ? mnemonicId : null
  }

  public getAccounts(): Account[] {
    return this.#storage.accounts.map(accountFromStorage)
  }

  public getAccount(address: string): Account | null {
    const account = this.#storage.accounts.find((s) => isAddressEqual(s.address, address))
    return account ? accountFromStorage(account) : null
  }

  public updateAccount(address: string, { name, isPortfolio }: UpdateAccountOptions) {
    const account = this.#storage.accounts.find((s) => s.address === address)
    if (!account) throw new Error("Account not found")

    if (name) account.name = name
    if (account.type === "watch-only" && isPortfolio !== undefined)
      account.isPortfolio = isPortfolio

    return accountFromStorage(account)
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

  private async ensureMnemonic(options: AddAccountDeriveOptions, password: string) {
    switch (options.type) {
      case "new-mnemonic": {
        const { mnemonic, mnemonicName: name, confirmed } = options
        const mnemonicId = this.getExistingMnemonicId(mnemonic)
        if (mnemonicId) return mnemonicId

        const { id } = await this.addMnemonic(
          {
            name,
            mnemonic,
            confirmed,
          },
          password,
        )

        return id
      }
      case "existing-mnemonic": {
        return options.mnemonicId
      }
    }
  }

  public async addAccountDerive(
    options: AddAccountDeriveOptions,
    password: string,
  ): Promise<Account> {
    const { curve, derivationPath, name } = options

    const mnemonicId = await this.ensureMnemonic(options, password)

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
      address: normalizeAddress(pair.address),
      secretKey: await encryptData(pair.secretKey, password),
      mnemonicId,
      createdAt: Date.now(),
    }

    this.#storage.accounts.push(account)

    return accountFromStorage(account)
  }

  public async addAccountKeypair(
    { curve, name, secretKey }: AddAccountKeypairOptions,
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
      address: normalizeAddress(address),
      secretKey: await encryptData(secretKey, password),
      createdAt: Date.now(),
    }

    this.#storage.accounts.push(account)

    return accountFromStorage(account)
  }

  public getAccountSecretKey(address: string, password: string): Promise<Uint8Array> {
    const account = this.#storage.accounts.find((a) => a.address === normalizeAddress(address))
    if (!account) throw new Error("Account not found")
    if (account.type !== "keypair") throw new Error("Secret key unavailable")

    return decryptData(account.secretKey, password)
  }

  public async getDerivedAddress(
    mnemonicId: string,
    derivationPath: string,
    curve: KeypairCurve,
    password: string,
  ): Promise<string> {
    const mnemonic = this.#storage.mnemonics.find((s) => s.id === mnemonicId)
    if (!mnemonic) throw new Error("Mnemonic not found")

    const entropy = await decryptData(mnemonic.entropy, password)
    const seed = entropyToSeed(entropy, curve)
    const pair = deriveKeypair(seed, derivationPath, curve)

    return pair.address
  }
}

const getMnemonicId = (entropy: Uint8Array) => {
  // one way hash to help identify duplicates
  // outputs 44 characters without special characters
  return bytesToString("base58", blake3(entropy))
}

const mnemonicFromStorage = (data: MnemonicStorage): Mnemonic => {
  const copy = structuredClone(data) as Mnemonic
  if ("entropy" in copy) delete copy.entropy
  return Object.freeze(copy)
}

const accountFromStorage = (data: AccountStorage): Account => {
  const copy = structuredClone(data) as Account
  if ("secretKey" in copy) delete copy.secretKey
  return Object.freeze(copy)
}
