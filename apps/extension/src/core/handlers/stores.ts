import { seedPhraseStore } from "@core/domains/accounts"
import { SeedPhraseData } from "@core/domains/accounts/store"
import { SettingsStoreData, appStore, passwordStore, settingsStore } from "@core/domains/app"
import { AppStoreData } from "@core/domains/app/store.app"
import { PasswordStoreData } from "@core/domains/app/store.password"
import { balanceStore } from "@core/domains/balances"
import { chainStore } from "@core/domains/chains"
import { sitesAuthorisationStore } from "@core/domains/sitesAuthorised"
import sitesAuthorisedStore from "@core/domains/sitesAuthorised/store"
import { AuthorizedSites } from "@core/domains/sitesAuthorised/types"
import { tokenRatesStore } from "@core/domains/tokenRates"
import transactionStore, { TransactionSubject } from "@core/domains/transfers/store"

export type TabStore = {
  chains: typeof chainStore
  tokenRates: typeof tokenRatesStore
  balances: typeof balanceStore
  transactions: typeof transactionStore // to delete in few months
  app: typeof appStore
  sites: typeof sitesAuthorisationStore
  settings: typeof settingsStore
}

export type ExtensionStore = TabStore & {
  password: typeof passwordStore
  seedPhrase: typeof seedPhraseStore
}

type GettableStores = {
  settings: [typeof settingsStore, SettingsStoreData]
  password: [typeof passwordStore, PasswordStoreData]
  app: [typeof appStore, AppStoreData]
  sites: [typeof sitesAuthorisedStore, AuthorizedSites]
  seedPhrase: [typeof seedPhraseStore, SeedPhraseData]
  transactions: [typeof transactionStore, TransactionSubject]
}
// Stores that expose the .get method
type GettableStoreKeys = keyof GettableStores

export type GettableStoreData = { [K in GettableStoreKeys]: GettableStores[K][1] }

export const tabStores = {
  chains: chainStore,
  tokenRates: tokenRatesStore,
  balances: balanceStore,
  transactions: transactionStore, // TODO this is the legacy transfers store which was called transactions. to be deleted in few months, this data now lives in db
  app: appStore,
  sites: sitesAuthorisationStore,
  settings: settingsStore,
}

export const extensionStores = {
  ...tabStores,
  password: passwordStore,
  seedPhrase: seedPhraseStore,
}

const localStorageStores: { [K in GettableStoreKeys]: GettableStores[K][0] } = {
  settings: settingsStore,
  password: passwordStore,
  app: appStore,
  sites: sitesAuthorisedStore,
  seedPhrase: seedPhraseStore,
  transactions: transactionStore, // TODO this is the legacy transfers store which was called transactions. to be deleted in few months, this data now lives in db
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
      // @ts-ignore
      async ([storeName, storeData]) => await localStorageStores[storeName].set(storeData)
    )
  )
}

export type Store = ExtensionStore | TabStore
