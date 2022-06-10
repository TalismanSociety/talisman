import { chainStore } from "@core/domains/chains"
import { tokenStore } from "@core/domains/tokens"
import { passwordStore, appStore, settingsStore } from "@core/domains/app"
import { balancesStore } from "@core/domains/balances"
import { metadataStore } from "@core/domains/metadata"
import { transactionStore } from "@core/domains/transactions"
import { evmNetworkStore } from "@core/domains/ethereum"
import { sitesAuthorisationStore } from "@core/domains/sitesAuthorised"
import { seedPhraseStore } from "@core/domains/accounts"

export const tabStores = {
  chains: chainStore,
  tokens: tokenStore,
  balances: balancesStore,
  transactions: transactionStore,
  evmNetworks: evmNetworkStore,
  app: appStore,
  sites: sitesAuthorisationStore,
  meta: metadataStore,
  settings: settingsStore,
}

export const extensionStores = {
  ...tabStores,
  password: passwordStore,
  seedPhrase: seedPhraseStore,
}

export type ExtensionStore = typeof extensionStores
export type TabStore = typeof tabStores
export type Store = ExtensionStore | TabStore
