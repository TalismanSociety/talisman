import { db } from "@core/db"
// import { Trees } from "@core/domains/accounts/helpers.catalog"
// import { AccountJsonAny } from "@core/domains/accounts/types"
// import { AppStoreData, appStore } from "@core/domains/app/store.app"
// import { SettingsStoreData, settingsStore } from "@core/domains/app/store.settings"
import { ActiveChains, activeChainsStore } from "@core/domains/chains/store.activeChains"
import {
  ActiveEvmNetworks,
  activeEvmNetworksStore,
} from "@core/domains/ethereum/store.activeEvmNetworks"
import { ActiveTokens, activeTokensStore } from "@core/domains/tokens/store.activeTokens"
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
import { combineLatest } from "rxjs"

const NO_OP = () => {}

// load these entities in parallel in this atom to prevent suspense to load them sequentially
export const mainState = atom<{
  // accounts: AccountJsonAny[]
  // accountsCatalog: Trees
  evmNetworks: (EvmNetwork | CustomEvmNetwork)[]
  chains: (Chain | CustomChain)[]
  tokens: TokenList
  activeEvmNetworksState: ActiveEvmNetworks
  activeChainsState: ActiveChains
  activeTokensState: ActiveTokens
  tokenRates: DbTokenRates[]
}>({
  key: "mainState",
  effects: [
    ({ setSelf }) => {
      const obsTokens = liveQuery(() => chaindataProvider.tokens())
      const obsEvmNetworks = liveQuery(() => chaindataProvider.evmNetworksArray())
      const obsChains = liveQuery(() => chaindataProvider.chainsArray())
      const obsTokenRates = liveQuery(() => db.tokenRates.toArray())
      // const obsAccountsCatalog = new Subject<Trees>()
      // const obsAccounts = new Subject<AccountJsonAny[]>()

      // TODO remove
      // eslint-disable-next-line no-console
      console.log("mainState.get")
      const stop = log.timer("mainState")
      const obsChainData = combineLatest([
        // obsAccounts,
        // obsAccountsCatalog,
        obsTokens,
        obsEvmNetworks,
        obsChains,
        obsTokenRates,
        activeTokensStore.observable,
        activeEvmNetworksStore.observable,
        activeChainsStore.observable,
      ]).subscribe(
        ([
          // accounts,
          // accountsCatalog,
          tokens,
          evmNetworks,
          chains,
          tokenRates,
          activeTokensState,
          activeEvmNetworksState,
          activeChainsState,
        ]) => {
          stop()
          setSelf({
            // accounts,
            // accountsCatalog,
            tokens,
            evmNetworks,
            chains,
            tokenRates,
            activeTokensState,
            activeEvmNetworksState,
            activeChainsState,
          })
        }
      )

      // const unsubAccountsCatalog = api.accountsCatalogSubscribe((v) => obsAccountsCatalog.next(v))
      // const unsubAccounts = api.accountsSubscribe((v) => obsAccounts.next(v))

      return () => {
        obsChainData.unsubscribe()
        // unsubAccounts()
        // unsubAccountsCatalog()
      }
    },
    () => api.tokens(NO_OP),
    () => api.ethereumNetworks(NO_OP),
    () => api.chains(NO_OP),
    () => api.tokenRates(NO_OP),
  ],
})
