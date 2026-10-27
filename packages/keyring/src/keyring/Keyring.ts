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
import { assertAddAccountExternalOptions, assertKeyringStorage } from "./validation"

export type KeyringStorage = {
  passwordCheck: string | null // well-known data encrypted using the password, used to ensure all secrets of the keyring are encrypted with the same password
  mnemonics: MnemonicStorage[]
  accounts: AccountStorage[]
}

const PASSWORD_CHECK_PHRASE = "PASSWORD_CHECK_PHRASE"

/**
 * Stores accounts and mnemonics, with their secrets encrypted under one password.
 *
 * A method that fails leaves the keyring as it was. Each mutating method does all of its
 * asynchronous work (password checks, decryption, derivation, encryption) and every check that can
 * throw before it changes anything, then applies the change synchronously. Calls may run
 * concurrently on one instance: the synchronous step checks for duplicates again, because another
 * call may have added the same account or mnemonic in the meantime.
 */
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

  /**
   * Builds a keyring from stored data. Throws if the data is malformed. The data passed in is
   * left unchanged.
   *
   * The loaded keyring trusts the blob's passwordCheck: whoever wrote the blob chose its password.
   * To import a blob from elsewhere (a backup, another device), call
   * `export(blobPassword, localPassword)` on it and store the result, which verifies the blob's
   * password and re-encrypts every secret under the local one.
   */
  public static load(data: KeyringStorage): Keyring {
    if (typeof data !== "object" || data === null) throw new Error("Invalid data")
    const copy = structuredClone(data)
    copy.passwordCheck ??= null

    // automatic upgrade : set default values for newly introduced properties
    if (Array.isArray(copy.accounts))
      for (const account of copy.accounts) {
        // @ts-expect-error
        if (account?.type === "ledger-polkadot" && !account.curve) account.curve = "ed25519"
      }

    assertKeyringStorage(copy)

    return new Keyring(copy)
  }

  /** Throws if `password` does not match passwordCheck, or if no password is set. */
  async #verifyPasswordCheck(password: string) {
    if (typeof password !== "string" || !password) throw new Error("password is required")
    if (!this.#data.passwordCheck) throw new Error("Invalid password")

    // run through same complexity as for other secrets, to make it so it s not easier to brute force passwordCheck than other secrets
    let bytes: Uint8Array
    try {
      bytes = await decryptData(this.#data.passwordCheck, oneWayHash(password))
    } catch {
      throw new Error("Invalid password")
    }
    const text = utf8.encode(bytes)
    bytes.fill(0)
    if (text !== PASSWORD_CHECK_PHRASE) throw new Error("Invalid password")
  }

  /**
   * Verifies `password` before a change that stores a secret. When no password is set yet, the
   * change sets it: this returns the passwordCheck to store, which #commit assigns.
   */
  async #preparePasswordCheck(password: string): Promise<string | null> {
    if (typeof password !== "string" || !password) throw new Error("password is required")
    if (!this.#data.passwordCheck) return createPasswordCheck(password)
    await this.#verifyPasswordCheck(password)
    return null
  }

  /**
   * Applies a change prepared by a method that stores secrets. `apply` must run its checks
   * before it mutates anything.
   *
   * Nothing awaits between the last check of passwordCheck and the end of `apply`, so the change
   * lands atomically. If another call set the password while this one was preparing, the password
   * is verified against it first, so every secret stays encrypted under the same password.
   */
  async #commit<T>(password: string, passwordCheck: string | null, apply: () => T): Promise<T> {
    if (passwordCheck && this.#data.passwordCheck) {
      await this.#verifyPasswordCheck(password)
      passwordCheck = null
    }
    const result = apply()
    if (passwordCheck) this.#data.passwordCheck = passwordCheck
    return result
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
      await this.#verifyPasswordCheck(password)
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
    if (typeof password !== "string" || !password) throw new Error("password is required")
    const passwordCheck = await createPasswordCheck(password)
    if (this.#data.passwordCheck !== null) {
      throw new Error("Password already set — cannot re-initialize")
    }
    this.#data.passwordCheck = passwordCheck
  }

  public toJson() {
    return structuredClone(this.#data)
  }

  /**
   * Returns a copy of the keyring data with every secret re-encrypted under `jsonPassword`. This
   * keyring is left unchanged.
   *
   * Throws if `password` does not match the keyring's password. A keyring with no password set
   * has no secrets (Keyring.load rejects one that does), so there is nothing to verify `password`
   * against and the copy gets `jsonPassword` as its password.
   */
  public async export(password: string, jsonPassword: string): Promise<KeyringStorage> {
    if (typeof password !== "string" || !password) throw new Error("password is required")
    if (typeof jsonPassword !== "string" || !jsonPassword)
      throw new Error("jsonPassword is required")

    if (this.#data.passwordCheck) await this.#verifyPasswordCheck(password)
    else if (this.#data.mnemonics.length || this.#data.accounts.some(isKeypairStorage))
      throw new Error("Invalid password")

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

    const passwordCheck = await this.#preparePasswordCheck(password)

    const entropy = mnemonicToEntropy(mnemonic)
    let storage: MnemonicStorage
    try {
      // id is a hash of the entropy, helps us prevent having duplicates and allows automatic remapping of accounts/mnemonics if mnemonics are deleted then re-added
      const id = oneWayHash(entropy)

      if (this.#findMnemonic(id)) throw new Error("Mnemonic already exists")

      storage = {
        id,
        name,
        entropy: await encryptData(entropy, password),
        confirmed,
        createdAt: Date.now(),
      }
    } finally {
      entropy.fill(0)
    }

    return this.#commit(password, passwordCheck, () => {
      if (this.#findMnemonic(storage.id)) throw new Error("Mnemonic already exists")
      this.#data.mnemonics.push(storage)
      return mnemonicFromStorage(storage)
    })
  }

  public getMnemonic(id: string): Mnemonic | null {
    const mnemonic = this.#findMnemonic(id)
    return mnemonic ? mnemonicFromStorage(mnemonic) : null
  }

  public updateMnemonic(id: string, { name, confirmed }: UpdateMnemonicOptions) {
    const mnemonic = this.#findMnemonic(id)
    if (!mnemonic) throw new Error("Mnemonic not found")
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
    const mnemonic = this.#findMnemonic(id)
    if (!mnemonic) throw new Error("Mnemonic not found")

    const entropy = await decryptData(mnemonic.entropy, password)
    try {
      // a string cannot be zeroed: the caller holds the only reference to the phrase
      return entropyToMnemonic(entropy)
    } finally {
      entropy.fill(0)
    }
  }

  public getExistingMnemonicId(mnemonic: string): string | null {
    const entropy = mnemonicToEntropy(mnemonic)
    try {
      const mnemonicId = oneWayHash(entropy)
      return this.#findMnemonic(mnemonicId) ? mnemonicId : null
    } finally {
      entropy.fill(0)
    }
  }

  public getAccounts(): Account[] {
    return this.#data.accounts.map(accountFromStorage)
  }

  public getAccount(address: string): Account | null {
    const account = this.#findAccount(address)
    return account ? accountFromStorage(account) : null
  }

  public updateAccount(address: string, { name, isPortfolio, genesisHash }: UpdateAccountOptions) {
    const account = this.#findAccount(address)
    if (!account) throw new Error("Account not found")

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
    const account = this.#findAccount(address)
    if (!account) throw new Error("Account not found")
    this.#data.accounts.splice(this.#data.accounts.indexOf(account), 1)
  }

  /**
   * Adds an account whose secret is not held by the keyring. The fields of the account's type are
   * checked when present; `secretKey` and `mnemonicId` are rejected, other fields are stored as
   * given.
   */
  public addAccountExternal(options: AddAccountExternalOptions): Account {
    assertAddAccountExternalOptions(options)

    const address = normalizeAddress(options.address) // breaks if invalid address

    if (this.#findAccount(address)) throw new Error("Account already exists")

    const account = {
      ...options,
      address,
      createdAt: Date.now(),
    } as AccountStorage

    this.#data.accounts.push(account)

    return accountFromStorage(account)
  }

  public async addAccountDerive(
    options: AddAccountDeriveOptions,
    password: string
  ): Promise<Account> {
    const passwordCheck = await this.#preparePasswordCheck(password)

    const { curve, derivationPath, name } = options
    if (typeof name !== "string") throw new Error("name is required")
    if (typeof derivationPath !== "string") throw new Error("derivationPath must be a string")

    // the mnemonic to derive from: either one already in the keyring, or one to add with the account
    let mnemonicId: string
    let entropy: Uint8Array
    let newMnemonic: Omit<MnemonicStorage, "entropy"> | null = null
    switch (options.type) {
      case "new-mnemonic": {
        const { mnemonic, mnemonicName, confirmed } = options

        if (typeof mnemonicName !== "string" || !mnemonicName)
          throw new Error("mnemonicName is required")
        if (typeof confirmed !== "boolean") throw new Error("confirmed is required")
        if (typeof mnemonic !== "string") throw new Error("mnemonic is required")
        if (!isValidMnemonic(mnemonic)) throw new Error("Invalid mnemonic")

        entropy = mnemonicToEntropy(mnemonic)
        mnemonicId = oneWayHash(entropy)
        if (!this.#findMnemonic(mnemonicId))
          newMnemonic = { id: mnemonicId, name: mnemonicName, confirmed, createdAt: Date.now() }
        break
      }
      case "existing-mnemonic": {
        if (typeof options.mnemonicId !== "string" || !options.mnemonicId)
          throw new Error("mnemonicId must be a string")

        mnemonicId = options.mnemonicId
        const mnemonic = this.#findMnemonic(mnemonicId)
        if (!mnemonic) throw new Error("Mnemonic not found")
        entropy = await decryptData(mnemonic.entropy, password)
        break
      }
      default:
        throw new Error("Invalid derivation type")
    }

    let seed: Uint8Array | undefined
    let secretKey: Uint8Array | undefined
    let account: AccountStorage
    let mnemonic: MnemonicStorage | null = null
    try {
      seed = await entropyToSeed(entropy, curve)
      const pair = deriveKeypair(seed, derivationPath, curve)
      secretKey = pair.secretKey
      const address = normalizeAddress(pair.address)

      if (this.#findAccount(address)) throw new Error("Account already exists")

      account = {
        type: "keypair",
        curve,
        name,
        address,
        secretKey: await encryptData(secretKey, password),
        mnemonicId,
        derivationPath,
        createdAt: Date.now(),
      }
      if (newMnemonic) mnemonic = { ...newMnemonic, entropy: await encryptData(entropy, password) }
    } finally {
      entropy.fill(0)
      seed?.fill(0)
      secretKey?.fill(0)
    }

    return this.#commit(password, passwordCheck, () => {
      if (this.#findAccount(account.address)) throw new Error("Account already exists")
      const existing = this.#findMnemonic(mnemonicId)
      if (!existing && !mnemonic) throw new Error("Mnemonic not found") // removed meanwhile

      // a concurrent call may have added the same mnemonic: both have the same id
      if (!existing && mnemonic) this.#data.mnemonics.push(mnemonic)
      this.#data.accounts.push(account)

      return accountFromStorage(account)
    })
  }

  /** Adds an account from a secret key. The caller keeps ownership of `secretKey`. */
  public async addAccountKeypair(
    { curve, name, secretKey }: AddAccountKeypairOptions,
    password: string
  ): Promise<Account> {
    const passwordCheck = await this.#preparePasswordCheck(password)

    if (typeof name !== "string") throw new Error("name is required")

    const publicKey = getPublicKeyFromSecret(secretKey, curve)
    const encoding = addressEncodingFromCurve(curve)
    const address = normalizeAddress(addressFromPublicKey(publicKey, encoding))

    if (this.#findAccount(address)) throw new Error("Account already exists")

    const account: AccountStorage = {
      type: "keypair",
      curve,
      name,
      address,
      secretKey: await encryptData(secretKey, password),
      createdAt: Date.now(),
    }

    return this.#commit(password, passwordCheck, () => {
      if (this.#findAccount(address)) throw new Error("Account already exists")
      this.#data.accounts.push(account)
      return accountFromStorage(account)
    })
  }

  /**
   * Decrypts an account's secret key. The caller owns the returned buffer and should zero it
   * (`secretKey.fill(0)`) once it is done with it.
   */
  public getAccountSecretKey(address: string, password: string): Promise<Uint8Array> {
    if (typeof address !== "string" || !address) throw new Error("address is required")
    if (typeof password !== "string" || !password) throw new Error("password is required")

    const account = this.#findAccount(address)
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

    const mnemonic = this.#findMnemonic(mnemonicId)
    if (!mnemonic) throw new Error("Mnemonic not found")

    const entropy = await decryptData(mnemonic.entropy, password)
    let seed: Uint8Array | undefined
    let secretKey: Uint8Array | undefined
    try {
      seed = await entropyToSeed(entropy, curve)
      const pair = deriveKeypair(seed, derivationPath, curve)
      secretKey = pair.secretKey
      return pair.address
    } finally {
      entropy.fill(0)
      seed?.fill(0)
      secretKey?.fill(0)
    }
  }

  #findMnemonic(id: string) {
    return this.#data.mnemonics.find((s) => s.id === id)
  }

  /** Every address lookup goes through here, so all methods match addresses the same way. */
  #findAccount(address: string) {
    return this.#data.accounts.find((s) => isAddressEqual(s.address, address))
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

const isKeypairStorage = (account: AccountStorage) => account.type === "keypair"

const createPasswordCheck = (password: string) =>
  encryptData(utf8.decode(PASSWORD_CHECK_PHRASE), oneWayHash(password))
