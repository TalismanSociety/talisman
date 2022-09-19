import { seedPhraseStore } from "@core/domains/accounts"
import { SeedPhraseData } from "@core/domains/accounts/store"
import { SettingsStoreData, appStore, passwordStore, settingsStore } from "@core/domains/app"
import { AppStoreData } from "@core/domains/app/store.app"
import { PasswordStoreData } from "@core/domains/app/store.password"
import { balancesStore } from "@core/domains/balances"
import { chainStore } from "@core/domains/chains"
import { evmNetworkStore } from "@core/domains/ethereum"
import { sitesAuthorisationStore } from "@core/domains/sitesAuthorised"
import sitesAuthorisedStore from "@core/domains/sitesAuthorised/store"
import { AuthorizedSites } from "@core/domains/sitesAuthorised/types"
import { tokenStore } from "@core/domains/tokens"
import transactionStore, { TransactionSubject } from "@core/domains/transactions/store"

export type TabStore = {
  chains: typeof chainStore
  tokens: typeof tokenStore
  balances: typeof balancesStore
  transactions: typeof transactionStore
  evmNetworks: typeof evmNetworkStore
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
  tokens: tokenStore,
  balances: balancesStore,
  transactions: transactionStore,
  evmNetworks: evmNetworkStore,
  app: appStore,
  sites: sitesAuthorisationStore,
  settings: settingsStore,
}

const localStorageStores: { [K in GettableStoreKeys]: GettableStores[K][0] } = {
  settings: settingsStore,
  password: passwordStore,
  app: appStore,
  sites: sitesAuthorisedStore,
  seedPhrase: seedPhraseStore,
  transactions: transactionStore,
}

const getStoreData = async <K extends GettableStoreKeys>([storeName, store]: [
  K,
  GettableStores[K][0]
]) => {
  return [storeName, await store.get()]
}

// utility functions used in tests
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

export const extensionStores = {
  ...tabStores,
  password: passwordStore,
  seedPhrase: seedPhraseStore,
  get: getLocalStorage,
  set: setLocalStorage,
}

export type Store = ExtensionStore | TabStore
