import { chainStore } from "@core/domains/chains"
import { tokenStore, evmAssetStore } from "@core/domains/tokens"
import { passwordStore, appStore, settingsStore } from "@core/domains/app"
import { balancesStore } from "@core/domains/balances"
import { metadataStore } from "@core/domains/metadata"
import { transactionStore } from "@core/domains/transactions"
import { ethereumNetworkStore } from "@core/domains/ethereum"
import { sitesAuthorisationStore } from "@core/domains/sitesAuthorised"
import { seedPhraseStore } from "@core/domains/accounts"

export const tabStores = {
  chains: chainStore,
  tokens: tokenStore,
  evmAssets: evmAssetStore,
  balances: balancesStore,
  transactions: transactionStore,
  ethereumNetworks: ethereumNetworkStore,
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
