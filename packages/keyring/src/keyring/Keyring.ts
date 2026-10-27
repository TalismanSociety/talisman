import {
  addressEncodingFromCurve,
  addressFromPublicKey,
  base58,
  blake3,
  deriveKeypair,
  entropyToMnemonic,
  entropyToSeed,
  getPublicKeyFromSecret,
  isAddressEqual,
  isValidMnemonic,
  type KeypairCurve,
  mnemonicToEntropy,
  normalizeAddress,
  utf8,
} from "@talismn/crypto"

import type { Account, Mnemonic } from "../types"
import { isAccountExternal } from "../types"
import type {
  AddAccountDeriveOptions,
  AddAccountExternalOptions,
  AddAccountKeypairOptions,
  AddMnemonicOptions,
  UpdateAccountOptions,
  UpdateMnemonicOptions,
} from "../types/keyring"
import { changeEncryptedDataPassword, decryptData, encryptData } from "./encryption"
import type { AccountStorage, MnemonicStorage } from "./types"
import { isHexString } from "./utils"

export type KeyringStorage = {
  passwordCheck: string | null // well-known data encrypted using the password, used to ensure all secrets of the keyring are encrypted with the same password
  mnemonics: MnemonicStorage[]
  accounts: AccountStorage[]
}

const PASSWORD_CHECK_PHRASE = "PASSWORD_CHECK_PHRASE"

export class Keyring {
  #data: KeyringStorage

  protected constructor(data: KeyringStorage) {
    this.#data = structuredClone(data)
  }

  public static create(): Keyring {
    return new Keyring({
      passwordCheck: null, // well-known data encrypted using the password, used to ensure all secrets of the keyring are encrypted with the same password
      mnemonics: [],
      accounts: [],
    })
  }

  public static load(data: KeyringStorage): Keyring {
    if (!data.accounts || !data.mnemonics) throw new Error("Invalid data")

    // automatic upgrade : set default values for newly introduced properties
    for (const account of data.accounts) {
      // @ts-expect-error
      if (account.type === "ledger-polkadot" && !account.curve) account.curve = "ed25519"
    }

    return new Keyring(data)
  }

  private async checkPassword(password: string, reset = false) {
    if (typeof password !== "string" || !password) throw new Error("password is required")

    const passwordHash = oneWayHash(password)

    // run through same complexity as for other secrets, to make it so it s not easier to brute force passwordCheck than other secrets
    if (!this.#data.passwordCheck || reset) {
      const bytes = utf8.decode(PASSWORD_CHECK_PHRASE)
      this.#data.passwordCheck = await encryptData(bytes, passwordHash)
    } else {
      try {
        const bytes = await decryptData(this.#data.passwordCheck, passwordHash)
        const text = utf8.encode(bytes)
        if (text !== PASSWORD_CHECK_PHRASE) throw new Error("Invalid password")
      } catch {
        throw new Error("Invalid password")
      }
    }
  }

  /** Returns true if a password has been set on this keyring. */
  public hasPassword(): boolean {
    return this.#data.passwordCheck !== null
  }

  /**
   * Verify a password against the keyring's passwordCheck blob.
   * Returns true on success, false on wrong password.
   * Throws if no password has been set (caller should check hasPassword() first).
   */
  public async verifyPassword(password: string): Promise<boolean> {
    if (!this.#data.passwordCheck) {
      throw new Error("No password set — call hasPassword() before verifyPassword()")
    }
    try {
      await this.checkPassword(password)
      return true
    } catch {
      return false
    }
  }

  /**
   * Initialize the password on a fresh keyring that has no password set.
   * Throws if a password is already set (use changePassword flow instead).
   */
  public async initializePassword(password: string): Promise<void> {
    if (this.#data.passwordCheck !== null) {
      throw new Error("Password already set — cannot re-initialize")
    }
    await this.checkPassword(password, true)
  }

  public toJson() {
    return structuredClone(this.#data)
  }

  /**
   * Returns a copy of the keyring data with every secret re-encrypted under `jsonPassword`. This
   * keyring is left unchanged.
   *
   * Throws if `password` is not the keyring's password. It is checked against passwordCheck
   * before anything is re-encrypted, and decrypting each secret checks it again.
   *
   * Every method that stores a secret sets passwordCheck first, so a keyring without one has no
   * secrets unless its data was written by other code. The extension sets the password lazily,
   * so a wallet with only Ledger, watch-only or contact accounts has none: there is nothing to
   * check `password` against, and the copy gets `jsonPassword` as its password.
   */
  public async export(password: string, jsonPassword: string): Promise<KeyringStorage> {
    if (typeof password !== "string" || !password) throw new Error("password is required")
    if (typeof jsonPassword !== "string" || !jsonPassword)
      throw new Error("jsonPassword is required")

    if (this.#data.passwordCheck) await this.checkPassword(password)

    const data = structuredClone(this.#data)

    for (const mnemonic of data.mnemonics)
      mnemonic.entropy = await changeEncryptedDataPassword(mnemonic.entropy, password, jsonPassword)

    for (const account of data.accounts)
      if (account.type === "keypair")
        account.secretKey = await changeEncryptedDataPassword(
          account.secretKey,
          password,
          jsonPassword
        )

    // reset password check
    data.passwordCheck = await createPasswordCheck(jsonPassword)

    return data
  }

  public getMnemonics(): Mnemonic[] {
    return this.#data.mnemonics.map(mnemonicFromStorage)
  }

  public async addMnemonic(
    { name, mnemonic, confirmed }: AddMnemonicOptions,
    password: string
  ): Promise<Mnemonic> {
    if (typeof name !== "string" || !name) throw new Error("name is required")
    if (typeof mnemonic !== "string") throw new Error("mnemonic is required")
    if (typeof confirmed !== "boolean") throw new Error("confirmed is required")
    if (!isValidMnemonic(mnemonic)) throw new Error("Invalid mnemonic")

    await this.checkPassword(password)

    const entropy = mnemonicToEntropy(mnemonic)

    // id is a hash of the entropy, helps us prevent having duplicates and allows automatic remapping of accounts/mnemonics if mnemonics are deleted then re-added
    const id = oneWayHash(entropy)

    if (this.#data.mnemonics.find((s) => s.id === id)) throw new Error("Mnemonic already exists")

    const storage: MnemonicStorage = {
      id,
      name,
      entropy: await encryptData(entropy, password),
      confirmed,
      createdAt: Date.now(),
    }

    this.#data.mnemonics.push(storage)

    return mnemonicFromStorage(storage)
  }

  public getMnemonic(id: string): Mnemonic | null {
    const mnemonic = this.#data.mnemonics.find((s) => s.id === id)
    return mnemonic ? mnemonicFromStorage(mnemonic) : null
  }

  public updateMnemonic(id: string, { name, confirmed }: UpdateMnemonicOptions) {
    const mnemonic = this.#data.mnemonics.find((s) => s.id === id)
    if (!mnemonic) throw new Error("Mnemonic not found")

    // check every option before applying any, so an invalid one changes nothing
    if (name !== undefined && (typeof name !== "string" || !name))
      throw new Error("name must be a string")
    if (confirmed !== undefined && typeof confirmed !== "boolean")
      throw new Error("confirmed must be a boolean")

    if (name !== undefined) mnemonic.name = name
    if (confirmed !== undefined) mnemonic.confirmed = confirmed

    return mnemonicFromStorage(mnemonic)
  }

  /**
   * Removes a mnemonic. Accounts derived from it are kept: each one stores its own encrypted
   * secret key, so it can still sign, and keeps its `mnemonicId`. The mnemonic's id is a hash of
   * its entropy, so adding the same mnemonic again links those accounts to it again.
   *
   * Until then, methods that need the mnemonic itself (`getMnemonicText`, `getDerivedAddress`,
   * `addAccountDerive` from that id, `updateMnemonic`) throw "Mnemonic not found" for that id.
   */
  public removeMnemonic(id: string) {
    const index = this.#data.mnemonics.findIndex((mnemonic) => mnemonic.id === id)
    if (index === -1) throw new Error("Mnemonic not found")
    this.#data.mnemonics.splice(index, 1)
  }

  async getMnemonicText(id: string, password: string): Promise<string> {
    const mnemonic = this.#data.mnemonics.find((s) => s.id === id)
    if (!mnemonic) throw new Error("Mnemonic not found")

    const entropy = await decryptData(mnemonic.entropy, password)

    return entropyToMnemonic(entropy)
  }

  public getExistingMnemonicId(mnemonic: string): string | null {
    const entropy = mnemonicToEntropy(mnemonic)
    const mnemonicId = oneWayHash(entropy)
    return this.#data.mnemonics.some((s) => s.id === mnemonicId) ? mnemonicId : null
  }

  public getAccounts(): Account[] {
    return this.#data.accounts.map(accountFromStorage)
  }

  public getAccount(address: string): Account | null {
    const account = this.#data.accounts.find((s) => isAddressEqual(s.address, address))
    return account ? accountFromStorage(account) : null
  }

  public updateAccount(address: string, { name, isPortfolio, genesisHash }: UpdateAccountOptions) {
    const account = this.#data.accounts.find((s) => s.address === address)
    if (!account) throw new Error("Account not found")

    // check every option before applying any, so an invalid one changes nothing
    if (name && typeof name !== "string") throw new Error("name is required")
    if (
      account.type === "watch-only" &&
      isPortfolio !== undefined &&
      typeof isPortfolio !== "boolean"
    )
      throw new Error("isPortfolio must be a boolean")
    if (account.type === "contact" && genesisHash && !isHexString(genesisHash))
      throw new Error("genesisHash must be a hex string")

    if (name) account.name = name
    if (account.type === "watch-only" && isPortfolio !== undefined)
      account.isPortfolio = isPortfolio
    // allow updating genesisHash only for contacts
    if (account.type === "contact") {
      if (genesisHash) account.genesisHash = genesisHash
      else delete account.genesisHash
    }

    return accountFromStorage(account)
  }

  public removeAccount(address: string) {
    const index = this.#data.accounts.findIndex((s) => isAddressEqual(s.address, address))
    if (index === -1) throw new Error("Account not found")
    this.#data.accounts.splice(index, 1)
  }

  public addAccountExternal(options: AddAccountExternalOptions): Account {
    const address = normalizeAddress(options.address) // breaks if invalid address

    if (this.getAccount(address)) throw new Error("Account already exists")

    const account: AccountStorage = {
      ...options,
      address,
      createdAt: Date.now(),
    }

    if (!isAccountExternal(account)) throw new Error("Invalid account type")

    this.#data.accounts.push(account)

    return accountFromStorage(account)
  }

  /**
   * Needs to be called before deriving an account from a mnemonic.
   *
   * This will ensure that it is present (or add it if possible) in the keyring before actually creating the account.
   *
   * @param options
   * @param password
   * @returns the id of the mnemonic
   */
  private async ensureMnemonic(options: AddAccountDeriveOptions, password: string) {
    await this.checkPassword(password)

    switch (options.type) {
      case "new-mnemonic": {
        const { mnemonic, mnemonicName: name, confirmed } = options

        if (typeof name !== "string" || !name) throw new Error("mnemonicName is required")
        if (typeof confirmed !== "boolean") throw new Error("confirmed is required")

        const mnemonicId = this.getExistingMnemonicId(mnemonic)
        if (mnemonicId) return mnemonicId

        const { id } = await this.addMnemonic(
          {
            name,
            mnemonic,
            confirmed,
          },
          password
        )

        return id
      }
      case "existing-mnemonic": {
        if (typeof options.mnemonicId !== "string" || !options.mnemonicId)
          throw new Error("mnemonicId must be a string")

        return options.mnemonicId
      }
    }
  }

  public async addAccountDerive(
    options: AddAccountDeriveOptions,
    password: string
  ): Promise<Account> {
    await this.checkPassword(password)

    const { curve, derivationPath, name } = options

    const mnemonicId = await this.ensureMnemonic(options, password)

    const mnemonic = this.#data.mnemonics.find((s) => s.id === mnemonicId)
    if (!mnemonic) throw new Error("Mnemonic not found")

    const entropy = await decryptData(mnemonic.entropy, password)
    const seed = await entropyToSeed(entropy, curve)
    const pair = deriveKeypair(seed, derivationPath, curve)

    if (this.getAccount(pair.address)) throw new Error("Account already exists")

    const account: AccountStorage = {
      type: "keypair",
      curve,
      name,
      address: normalizeAddress(pair.address),
      secretKey: await encryptData(pair.secretKey, password),
      mnemonicId,
      derivationPath,
      createdAt: Date.now(),
    }

    // a concurrent call on this instance may have added the same account during the awaits
    if (this.getAccount(account.address)) throw new Error("Account already exists")
    this.#data.accounts.push(account)

    return accountFromStorage(account)
  }

  public async addAccountKeypair(
    { curve, name, secretKey }: AddAccountKeypairOptions,
    password: string
  ): Promise<Account> {
    await this.checkPassword(password)

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

    // a concurrent call on this instance may have added the same account during the await
    if (this.getAccount(account.address)) throw new Error("Account already exists")
    this.#data.accounts.push(account)

    return accountFromStorage(account)
  }

  public getAccountSecretKey(address: string, password: string): Promise<Uint8Array> {
    if (typeof address !== "string" || !address) throw new Error("address is required")
    if (typeof password !== "string" || !password) throw new Error("password is required")

    const account = this.#data.accounts.find((a) => a.address === normalizeAddress(address))
    if (!account) throw new Error("Account not found")
    if (account.type !== "keypair") throw new Error("Secret key unavailable")

    return decryptData(account.secretKey, password)
  }

  public async getDerivedAddress(
    mnemonicId: string,
    derivationPath: string,
    curve: KeypairCurve,
    password: string
  ): Promise<string> {
    if (typeof mnemonicId !== "string" || !mnemonicId) throw new Error("mnemonicId is required")
    if (typeof password !== "string" || !password) throw new Error("password is required")

    const mnemonic = this.#data.mnemonics.find((s) => s.id === mnemonicId)
    if (!mnemonic) throw new Error("Mnemonic not found")

    const entropy = await decryptData(mnemonic.entropy, password)
    const seed = await entropyToSeed(entropy, curve)
    const pair = deriveKeypair(seed, derivationPath, curve)

    return pair.address
  }
}

const oneWayHash = (bytes: Uint8Array | string) => {
  if (typeof bytes === "string") bytes = utf8.decode(bytes)

  // cryptographically secure one way hash
  // outputs 44 characters without special characters
  return base58.encode(blake3(bytes))
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

const createPasswordCheck = (password: string) =>
  encryptData(utf8.decode(PASSWORD_CHECK_PHRASE), oneWayHash(password))
