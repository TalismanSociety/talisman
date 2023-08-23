import { accountsCatalogStore } from "@core/domains/accounts"
import { AccountsCatalogData } from "@core/domains/accounts/store.catalog"
import { SettingsStoreData, appStore, passwordStore, settingsStore } from "@core/domains/app"
import { AppStoreData } from "@core/domains/app/store.app"
import { PasswordStoreData } from "@core/domains/app/store.password"
import { balanceStore } from "@core/domains/balances"
import { MnemonicData, mnemonicsStore } from "@core/domains/mnemonics/store"
import { sitesAuthorisationStore } from "@core/domains/sitesAuthorised"
import sitesAuthorisedStore from "@core/domains/sitesAuthorised/store"
import { AuthorizedSites } from "@core/domains/sitesAuthorised/types"
import { tokenRatesStore } from "@core/domains/tokenRates"

export type TabStore = {
  tokenRates: typeof tokenRatesStore
  balances: typeof balanceStore
  app: typeof appStore
  sites: typeof sitesAuthorisationStore
  settings: typeof settingsStore
}

export type ExtensionStore = TabStore & {
  password: typeof passwordStore
  mnemonics: typeof mnemonicsStore
  accountsCatalog: typeof accountsCatalogStore
}

type GettableStores = {
  settings: [typeof settingsStore, SettingsStoreData]
  password: [typeof passwordStore, PasswordStoreData]
  app: [typeof appStore, AppStoreData]
  sites: [typeof sitesAuthorisedStore, AuthorizedSites]
  seedPhrase: [typeof mnemonicsStore, MnemonicData]
  accountsCatalog: [typeof accountsCatalogStore, AccountsCatalogData]
}
// Stores that expose the .get method
type GettableStoreKeys = keyof GettableStores

export type GettableStoreData = { [K in GettableStoreKeys]: GettableStores[K][1] }

export const tabStores = {
  tokenRates: tokenRatesStore,
  balances: balanceStore,
  app: appStore,
  sites: sitesAuthorisationStore,
  settings: settingsStore,
}

export const extensionStores = {
  ...tabStores,
  password: passwordStore,
  mnemonics: mnemonicsStore,
  accountsCatalog: accountsCatalogStore,
}

const localStorageStores: { [K in GettableStoreKeys]: GettableStores[K][0] } = {
  settings: settingsStore,
  password: passwordStore,
  app: appStore,
  sites: sitesAuthorisedStore,
  seedPhrase: mnemonicsStore,
  accountsCatalog: accountsCatalogStore,
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
