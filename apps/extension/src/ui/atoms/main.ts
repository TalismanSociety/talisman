import { db } from "@core/db"
import { Trees } from "@core/domains/accounts/helpers.catalog"
import { AccountJsonAny } from "@core/domains/accounts/types"
import { AppStoreData, appStore } from "@core/domains/app/store.app"
import { SettingsStoreData, settingsStore } from "@core/domains/app/store.settings"
import { EnabledChains, enabledChainsStore } from "@core/domains/chains/store.enabledChains"
import {
  EnabledEvmNetworks,
  enabledEvmNetworksStore,
} from "@core/domains/ethereum/store.enabledEvmNetworks"
import { EnabledTokens, enabledTokensStore } from "@core/domains/tokens/store.enabledTokens"
import { log } from "@core/log"
import { chaindataProvider } from "@core/rpcs/chaindata"
import {
  Chain,
  CustomChain,
  CustomEvmNetwork,
  EvmNetwork,
  TokenList,
} from "@talismn/chaindata-provider"
import { DbTokenRates } from "@talismn/token-rates"
import { api } from "@ui/api"
import { liveQuery } from "dexie"
import { atom } from "recoil"
import { Subject, combineLatest } from "rxjs"

const NO_OP = () => {}

// load these entities in parallel in this atom to prevent recoil/suspense to load them sequentially
export const walletDataState = atom<{
  settings: SettingsStoreData
  appState: AppStoreData
  accounts: AccountJsonAny[]
  accountsCatalog: Trees
  evmNetworks: (EvmNetwork | CustomEvmNetwork)[]
  chains: (Chain | CustomChain)[]
  tokens: TokenList
  enabledEvmNetworksState: EnabledEvmNetworks
  enabledChainsState: EnabledChains
  enabledTokensState: EnabledTokens
  tokenRates: DbTokenRates[]
}>({
  key: "walletDataState",
  effects: [
    ({ setSelf }) => {
      const obsTokens = liveQuery(() => chaindataProvider.tokens())
      const obsEvmNetworks = liveQuery(() => chaindataProvider.evmNetworksArray())
      const obsChains = liveQuery(() => chaindataProvider.chainsArray())
      const obsTokenRates = liveQuery(() => db.tokenRates.toArray())
      const obsAccounts = new Subject<AccountJsonAny[]>()
      const unsubAccounts = api.accountsSubscribe((v) => obsAccounts.next(v))
      const obsAccountsCatalog = new Subject<Trees>()
      const unsubAccountsCatalog = api.accountsCatalogSubscribe((v) => obsAccountsCatalog.next(v))

      const stop = log.timer("walletDataState")
      const obsChainData = combineLatest([
        settingsStore.observable,
        appStore.observable,
        obsAccounts,
        obsAccountsCatalog,
        obsTokens,
        obsEvmNetworks,
        obsChains,
        obsTokenRates,
        enabledTokensStore.observable,
        enabledEvmNetworksStore.observable,
        enabledChainsStore.observable,
      ]).subscribe(
        ([
          settings,
          appState,
          accounts,
          accountsCatalog,
          tokens,
          evmNetworks,
          chains,
          tokenRates,
          enabledTokensState,
          enabledEvmNetworksState,
          enabledChainsState,
        ]) => {
          stop()
          setSelf({
            settings,
            appState,
            accounts,
            accountsCatalog,
            tokens,
            evmNetworks,
            chains,
            tokenRates,
            enabledTokensState,
            enabledEvmNetworksState,
            enabledChainsState,
          })
        }
      )

      return () => {
        obsChainData.unsubscribe()
        unsubAccounts()
        unsubAccountsCatalog()
      }
    },
    () => api.tokens(NO_OP),
    () => api.chains(NO_OP),
    () => api.ethereumNetworks(NO_OP),
    () => api.tokenRates(NO_OP),
  ],
})
