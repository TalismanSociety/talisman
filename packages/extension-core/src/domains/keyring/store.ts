import { assert } from "@polkadot/util"
import { KeypairCurve } from "@talismn/crypto"
import {
  Account,
  AddAccountDeriveOptions,
  AddAccountExternalOptions,
  AddAccountKeypairOptions,
  AddMnemonicOptions,
  Keyring,
  Mnemonic,
  UpdateAccountOptions,
  UpdateMnemonicOptions,
} from "@talismn/keyring"
import { log } from "extension-shared"
import { isEqual } from "lodash"
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

const LOCAL_STORAGE_KEY = "keyring"

/**
 * In charge of loading and saving keyring to extension's local storage where save operation has to be called explicitely, allowing to revert batches of changes if anything goes wrong.
 * Also provides observables for accounts and mnemonics.
 */
class KeyringStore {
  #lock = false
  #serialized$ = new ReplaySubject<string>(1)
  #keyring$: Observable<Readonly<Keyring>>
  #accounts$: Observable<Account[]>
  #mnemonics$: Observable<Mnemonic[]>

  constructor() {
    if (!isBackgroundPage())
      throw new Error("Keyring store can only be accessed from the background process")

    this.#keyring$ = this.#serialized$.pipe(
      map((s) => (s ? Keyring.load(s) : Keyring.create())),
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
      const data = await chrome.storage.local.get(LOCAL_STORAGE_KEY)
      this.#serialized$.next(data[LOCAL_STORAGE_KEY])
    } catch (cause) {
      throw new Error("Failed to load keyring", { cause })
    }
  }

  private async save(keyring: Keyring) {
    try {
      const serialized = keyring.toString()
      await chrome.storage.local.set({ [LOCAL_STORAGE_KEY]: serialized })
      this.#serialized$.next(serialized)
    } catch (err) {
      throw new Error("Failed to save keyring", { cause: err })
    }
  }

  private async loadNew() {
    const serialized = await firstValueFrom(this.#serialized$)
    return serialized ? Keyring.load(serialized) : Keyring.create()
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
  private async changeWithPassword<T>(
    change: (keyring: Keyring, password: string) => T | Promise<T>,
  ) {
    return this.withLock(async () => {
      const password = await passwordStore.getPassword()
      assert(password, "Not logged in")

      const keyring = await this.loadNew()
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
  private async changeWithoutPassword<T>(change: (keyring: Keyring) => T | Promise<T>) {
    return this.withLock(async () => {
      const keyring = await this.loadNew()
      const returnValue = await change(keyring)

      await this.save(keyring)

      return returnValue as T
    })
  }

  public addMnemonic(options: AddMnemonicOptions) {
    return this.changeWithPassword((keyring, password) => keyring.addMnemonic(options, password))
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
    const hash = await passwordStore.getHashedPassword(password)
    const keyring = await firstValueFrom(this.#keyring$)
    return keyring.getMnemonicText(id, hash)
  }

  public async getExistingMnemonicId(mnemonic: string) {
    const keyring = await firstValueFrom(this.#keyring$)
    return keyring.getExistingMnemonicId(mnemonic)
  }

  public updateMnemonic(id: string, options: UpdateMnemonicOptions) {
    return this.changeWithoutPassword((keyring) => keyring.updateMnemonic(id, options))
  }

  public removeMnemonic(id: string) {
    return this.changeWithoutPassword((keyring) => keyring.removeMnemonic(id))
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
    return this.changeWithoutPassword((keyring) => keyring.updateAccount(id, options))
  }

  public removeAccount(address: string) {
    return this.changeWithoutPassword((keyring) => keyring.removeAccount(address))
  }

  public addAccountExternal(options: AddAccountExternalOptions) {
    return this.changeWithoutPassword((keyring) => keyring.addAccountExternal(options))
  }

  public addAccountDerive(options: AddAccountDeriveOptions) {
    return this.changeWithPassword((keyring, password) =>
      keyring.addAccountDerive(options, password),
    )
  }

  public addAccountKeypair(options: AddAccountKeypairOptions) {
    return this.changeWithPassword((keyring, password) =>
      keyring.addAccountKeypair(options, password),
    )
  }

  public addAccountKeypairs(options: AddAccountKeypairOptions[]) {
    return this.changeWithPassword((keyring, password) =>
      Promise.all(options.map((options) => keyring.addAccountKeypair(options, password))),
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
}

export const keyringStore = new KeyringStore()

keyringStore.accounts$.subscribe((accounts) => {
  log.log("[KeyringStore] accounts$", accounts)
})
keyringStore.mnemonics$.subscribe((mnemonics) => {
  log.log("[KeyringStore] mnemonics$", mnemonics)
})
