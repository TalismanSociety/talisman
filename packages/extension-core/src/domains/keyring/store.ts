import { Keyring } from "@talismn/keyring"
import { firstValueFrom, map, ReplaySubject, shareReplay } from "rxjs"

const LOCAL_STORAGE_KEY = "keyring"

/**
 * In charge of loading and saving keyring to extension's local storage where save operation has to be called explicitely, allowing to revert batches of changes if anything goes wrong.
 * Also provides observables for accounts and mnemonics.
 */
class KeyringStore {
  #keyring = new ReplaySubject<Keyring>(1)

  constructor() {
    this.load()
  }

  /**
   * Used automatically when initializing the store from storage, can also be called to revert changes
   */
  public async load() {
    try {
      const data = await chrome.storage.local.get(LOCAL_STORAGE_KEY)

      const keyring = data[LOCAL_STORAGE_KEY]
        ? Keyring.load(data[LOCAL_STORAGE_KEY])
        : Keyring.create()

      this.#keyring.next(keyring)
    } catch (cause) {
      throw new Error("Failed to load keyring", { cause })
    }
  }

  public async save() {
    try {
      const keyring = await firstValueFrom(this.#keyring)

      await chrome.storage.local.set({ [LOCAL_STORAGE_KEY]: keyring.toString() })

      this.#keyring.next(keyring)
    } catch (cause) {
      throw new Error("Failed to save keyring", { cause })
    }
  }

  public get accounts$() {
    return this.#keyring.pipe(
      map((keyring) => keyring.getAccounts()),
      shareReplay(1),
    )
  }

  public get mnemonics$() {
    return this.#keyring.pipe(
      map((keyring) => keyring.getMnemonics()),
      shareReplay(1),
    )
  }

  public get keyring$() {
    return this.#keyring.asObservable()
  }
}

export const keyringStore = new KeyringStore()
