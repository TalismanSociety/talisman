import { assert } from "@polkadot/util"
import { KeypairCurve } from "@talismn/crypto"
import {
  Account,
  AddAccountDeriveOptions,
  AddAccountExternalOptions,
  AddAccountKeypairOptions,
  AddMnemonicOptions,
  Keyring,
  KeyringStorage,
  Mnemonic,
  UpdateAccountOptions,
  UpdateMnemonicOptions,
} from "@talismn/keyring"
import { log } from "extension-shared"
import { isEqual } from "lodash-es"
import {
  distinctUntilChanged,
  firstValueFrom,
  map,
  Observable,
  ReplaySubject,
  shareReplay,
} from "rxjs"

import { isBackgroundPage } from "../../util/isBackgroundPage"
import { passwordStore } from "../app/store.password"

const TALISMAN_KEYRING_LOCAL_STORAGE_KEY = "keyring"

/**
 * Keyring with data stored in extension's local storage.
 * Also provides observables for accounts and mnemonics.
 */
class KeyringStore {
  #json$ = new ReplaySubject<KeyringStorage>(1)
  #lock = false
  #keyring$: Observable<Readonly<Keyring>>
  #accounts$: Observable<Account[]>
  #mnemonics$: Observable<Mnemonic[]>

  constructor() {
    if (!isBackgroundPage())
      throw new Error("Keyring store should only be accessed from the background thread")

    this.#keyring$ = this.#json$.pipe(
      map((json) => (json ? Keyring.load(json) : Keyring.create())),
      map((keyring) => Object.freeze(keyring)),
      shareReplay(1),
    )

    this.#accounts$ = this.#keyring$.pipe(
      map((keyring) => keyring.getAccounts()),
      distinctUntilChanged(isEqual),
      shareReplay(1),
    )

    this.#mnemonics$ = this.#keyring$.pipe(
      map((keyring) => keyring.getMnemonics()),
      distinctUntilChanged(isEqual),
      shareReplay(1),
    )

    this.init()
  }

  public get accounts$() {
    return this.#accounts$
  }

  public get mnemonics$() {
    return this.#mnemonics$
  }

  private async init() {
    try {
      const storage = await chrome.storage.local.get(TALISMAN_KEYRING_LOCAL_STORAGE_KEY)
      this.#json$.next(storage[TALISMAN_KEYRING_LOCAL_STORAGE_KEY])
    } catch (cause) {
      throw new Error("Failed to load keyring", { cause })
    }
  }

  private async save(keyring: Keyring) {
    try {
      const json = keyring.toJson()
      await chrome.storage.local.set({
        [TALISMAN_KEYRING_LOCAL_STORAGE_KEY]: json,
      })
      this.#json$.next(json)
    } catch (err) {
      throw new Error("Failed to save keyring", { cause: err })
    }
  }

  private async load() {
    const json = await firstValueFrom(this.#json$)
    return json ? Keyring.load(json) : Keyring.create()
  }

  private async withLock<T>(fn: () => T): Promise<T> {
    if (this.#lock) throw new Error("Another change is already in progress")
    this.#lock = true
    try {
      return await fn()
    } finally {
      this.#lock = false
    }
  }

  /**
   * Wraps an atomic change that requires password to be provided
   * @param change
   * @returns
   */
  private async updateWithPassword<T>(
    change: (keyring: Keyring, password: string) => T | Promise<T>,
  ) {
    return this.withLock(async () => {
      const password = await passwordStore.getPassword()
      assert(password, "Not logged in")

      const keyring = await this.load()
      const returnValue = await change(keyring, password)

      await this.save(keyring)

      return returnValue as T
    })
  }

  /**
   * Wraps an atomic change that does not require password to be provided
   * @param change
   * @returns
   */
  private async updateWithoutPassword<T>(change: (keyring: Keyring) => T | Promise<T>) {
    return this.withLock(async () => {
      const keyring = await this.load()
      const returnValue = await change(keyring)

      await this.save(keyring)

      return returnValue as T
    })
  }

  public addMnemonic(options: AddMnemonicOptions) {
    return this.updateWithPassword((keyring, password) => keyring.addMnemonic(options, password))
  }

  public async getMnemonics() {
    const keyring = await firstValueFrom(this.#keyring$)
    return keyring.getMnemonics()
  }

  public async getMnemonic(id: string) {
    const keyring = await firstValueFrom(this.#keyring$)
    return keyring.getMnemonic(id)
  }

  public async getMnemonicText(id: string, password: string) {
    const keyring = await firstValueFrom(this.#keyring$)
    return keyring.getMnemonicText(id, password)
  }

  public async getExistingMnemonicId(mnemonic: string) {
    const keyring = await firstValueFrom(this.#keyring$)
    return keyring.getExistingMnemonicId(mnemonic)
  }

  public updateMnemonic(id: string, options: UpdateMnemonicOptions) {
    return this.updateWithoutPassword((keyring) => keyring.updateMnemonic(id, options))
  }

  public removeMnemonic(id: string) {
    return this.updateWithoutPassword((keyring) => keyring.removeMnemonic(id))
  }

  public async getAccounts() {
    const keyring = await firstValueFrom(this.#keyring$)
    return keyring.getAccounts()
  }

  public async getAccount(address: string) {
    const keyring = await firstValueFrom(this.#keyring$)
    return keyring.getAccount(address)
  }

  public updateAccount(id: string, options: UpdateAccountOptions) {
    return this.updateWithoutPassword((keyring) => keyring.updateAccount(id, options))
  }

  public removeAccount(address: string) {
    return this.updateWithoutPassword((keyring) => keyring.removeAccount(address))
  }

  public addAccountExternal(options: AddAccountExternalOptions) {
    return this.updateWithoutPassword((keyring) => keyring.addAccountExternal(options))
  }

  public addAccountExternalMulti(options: AddAccountExternalOptions[]) {
    return this.updateWithoutPassword((keyring) =>
      Promise.all(options.map((acc) => keyring.addAccountExternal(acc))),
    )
  }

  public addAccountDerive(options: AddAccountDeriveOptions) {
    return this.updateWithPassword((keyring, password) =>
      keyring.addAccountDerive(options, password),
    )
  }

  public addAccountDeriveMulti(options: AddAccountDeriveOptions[]) {
    return this.updateWithPassword(async (keyring, password) => {
      // create accounts sequentially to prevent adding the same mnemonic multiple times
      const results: Account[] = []
      for (const option of options) {
        results.push(await keyring.addAccountDerive(option, password))
      }
      return results
    })
  }

  public addAccountKeypair(options: AddAccountKeypairOptions) {
    return this.updateWithPassword((keyring, password) =>
      keyring.addAccountKeypair(options, password),
    )
  }

  public addAccountKeypairMulti(options: AddAccountKeypairOptions[]) {
    return this.updateWithPassword((keyring, password) =>
      Promise.all(options.map((acc) => keyring.addAccountKeypair(acc, password))),
    )
  }

  public async getAccountSecretKey(address: string, password: string): Promise<Uint8Array> {
    const keyring = await firstValueFrom(this.#keyring$)
    return keyring.getAccountSecretKey(address, password)
  }

  public async getDerivedAddress(
    mnemonicId: string,
    derivationPath: string,
    curve: KeypairCurve,
    password: string,
  ): Promise<string> {
    const keyring = await firstValueFrom(this.#keyring$)
    return keyring.getDerivedAddress(mnemonicId, derivationPath, curve, password)
  }

  public reset(): Promise<void> {
    return this.withLock(() => {
      const emptyKeyring = Keyring.create()
      this.#json$.next(emptyKeyring.toJson())
    })
  }

  public async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    return this.withLock(async () => {
      const keyring = await this.load()
      const serialized = await keyring.export(oldPassword, newPassword)

      await chrome.storage.local.set({ [TALISMAN_KEYRING_LOCAL_STORAGE_KEY]: serialized })
      this.#json$.next(serialized)
    })
  }

  public async backup(password: string, jsonPassword: string) {
    return this.withLock(async () => {
      const keyring = await this.load()
      return keyring.export(password, jsonPassword)
    })
  }

  public async restore(json: KeyringStorage, jsonPassword: string, password: string) {
    return this.withLock(async () => {
      const keyring = Keyring.load(json)

      // changes all passwords to the local one
      const newJson = await keyring.export(jsonPassword, password)

      // persist new data
      await chrome.storage.local.set({ [TALISMAN_KEYRING_LOCAL_STORAGE_KEY]: newJson })

      this.#json$.next(newJson)
    })
  }

  /**
   * use this method to force keyring storage to be updated
   * this is because keyring updates its schema on load, but doesnt persist changes automatically
   * */
  public forceUpdate(): Promise<void> {
    return this.updateWithoutPassword(() => {})
  }
}

export const keyringStore = new KeyringStore()

keyringStore.accounts$.subscribe((accounts) => {
  log.debug("[KeyringStore] accounts$", accounts)
})
keyringStore.mnemonics$.subscribe((mnemonics) => {
  log.debug("[KeyringStore] mnemonics$", mnemonics)
})
