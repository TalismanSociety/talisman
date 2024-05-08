import { accountsCatalogStore } from "../domains/accounts"
import { AccountsCatalogData } from "../domains/accounts/store.catalog"
import { AppStoreData, appStore } from "../domains/app/store.app"
import { ErrorsStoreData, errorsStore } from "../domains/app/store.errors"
import { PasswordStoreData, passwordStore } from "../domains/app/store.password"
import { remoteConfigStore } from "../domains/app/store.remoteConfig"
import { SettingsStoreData, settingsStore } from "../domains/app/store.settings"
import { RemoteConfigStoreData } from "../domains/app/types"
import { MnemonicData, mnemonicsStore } from "../domains/mnemonics/store"
import { sitesAuthorisationStore } from "../domains/sitesAuthorised"
import sitesAuthorisedStore from "../domains/sitesAuthorised/store"
import { AuthorizedSites } from "../domains/sitesAuthorised/types"
import { tokenRatesStore } from "../domains/tokenRates"

export type TabStore = {
  app: typeof appStore
  errors: typeof errorsStore
  settings: typeof settingsStore
  sites: typeof sitesAuthorisationStore
  tokenRates: typeof tokenRatesStore
  remoteConfig: typeof remoteConfigStore
}

export type ExtensionStore = TabStore & {
  accountsCatalog: typeof accountsCatalogStore
  mnemonics: typeof mnemonicsStore
  password: typeof passwordStore
}

type GettableStores = {
  accountsCatalog: [typeof accountsCatalogStore, AccountsCatalogData]
  app: [typeof appStore, AppStoreData]
  errors: [typeof errorsStore, ErrorsStoreData]
  password: [typeof passwordStore, PasswordStoreData]
  seedPhrase: [typeof mnemonicsStore, MnemonicData]
  settings: [typeof settingsStore, SettingsStoreData]
  sites: [typeof sitesAuthorisedStore, AuthorizedSites]
  remoteConfig: [typeof remoteConfigStore, RemoteConfigStoreData]
}
// Stores that expose the .get method
type GettableStoreKeys = keyof GettableStores

export type GettableStoreData = { [K in GettableStoreKeys]: GettableStores[K][1] }

export const tabStores = {
  app: appStore,
  errors: errorsStore,
  settings: settingsStore,
  sites: sitesAuthorisationStore,
  tokenRates: tokenRatesStore,
  remoteConfig: remoteConfigStore,
}

export const extensionStores = {
  ...tabStores,
  accountsCatalog: accountsCatalogStore,
  mnemonics: mnemonicsStore,
  password: passwordStore,
}

const localStorageStores: { [K in GettableStoreKeys]: GettableStores[K][0] } = {
  accountsCatalog: accountsCatalogStore,
  app: appStore,
  errors: errorsStore,
  password: passwordStore,
  seedPhrase: mnemonicsStore,
  settings: settingsStore,
  sites: sitesAuthorisedStore,
  remoteConfig: remoteConfigStore,
}

// utility functions used in tests
const getStoreData = async <K extends GettableStoreKeys>([storeName, store]: [
  K,
  GettableStores[K][0]
]) => {
  return [storeName, await store.get()]
}

export const getLocalStorage = async (): Promise<GettableStoreData> =>
  Object.fromEntries(
    await Promise.all(
      Object.entries(localStorageStores).map(([storeName, store]) =>
        getStoreData([storeName as GettableStoreKeys, store])
      )
    )
  )

export const setLocalStorage = async <T extends GettableStoreKeys>(
  data: Partial<{
    [K in GettableStoreKeys]: Partial<GettableStoreData[K]>
  }>
) => {
  return Promise.all(
    (Object.entries(data) as Array<[T, Partial<GettableStoreData[T]>]>).map(
      async ([storeName, storeData]) => await localStorageStores[storeName].set(storeData as never)
    )
  )
}

export type Store = ExtensionStore | TabStore
