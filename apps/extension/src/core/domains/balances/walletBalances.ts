import { log } from "@common/log"
import type { Address } from "@talismn/balances"
import type { TokenId } from "@talismn/chaindata-provider"
import { isAccountNotContact } from "@talismn/keyring"
import { firstThenDebounce, keepAlive } from "@talismn/util"
import { fromPairs, isEqual } from "lodash-es"
import { combineLatest, distinctUntilChanged, map, shareReplay, switchMap, tap } from "rxjs"

import { chaindataProvider } from "../../rpcs/chaindata"
import { isAccountCompatibleWithNetwork } from "../accounts/helpers"
import { settingsStore } from "../app/store.settings"
import { keyringStore } from "../keyring/store"
import { balancesProvider } from "./balancesProvider"
import { activeNetworksStore, isNetworkActive } from "./store.activeNetworks"
import { activeTokensStore, isTokenActive } from "./store.activeTokens"
import { balancesStore$ } from "./store.balances"

const walletAddressesByTokenId$ = combineLatest({
  networks: chaindataProvider.networks$,
  tokens: chaindataProvider.tokens$,
  accounts: keyringStore.accounts$,
  activeTokens: activeTokensStore.observable,
  activeNetworks: activeNetworksStore.observable,
}).pipe(
  map(({ networks, tokens, accounts, activeTokens, activeNetworks }) => {
    const arNetworks = networks.filter((n) => isNetworkActive(n, activeNetworks))
    const arTokens = tokens.filter((t) => isTokenActive(t, activeTokens))

    return fromPairs(
      arNetworks.flatMap((network) => {
        const networkTokens = arTokens.filter((t) => t.networkId === network.id)
        const networkAccounts = accounts
          .filter(isAccountNotContact)
          .filter((a) => isAccountCompatibleWithNetwork(network, a))
        return networkTokens.map(
          (token) => [token.id, networkAccounts.map((a) => a.address)] as [TokenId, Address[]]
        )
      })
    )
  }),
  distinctUntilChanged<Record<TokenId, Address[]>>(isEqual)
)

export const walletBalances$ = settingsStore.observable.pipe(
  map((settings) => settings.disableBalanceFetching),
  distinctUntilChanged(),
  switchMap((disabled) => {
    if (disabled) {
      log.debug("[balances] fetching disabled, serving cached balances")
      return balancesStore$.pipe(
        map((storage) => ({
          status: "live" as const,
          balances: storage.balances,
          failedBalanceIds: [],
        }))
      )
    }

    return walletAddressesByTokenId$.pipe(
      switchMap((addressesByTokenId) => balancesProvider.getBalances$(addressesByTokenId)),
      firstThenDebounce(500),
      tap({
        subscribe: () => log.debug("[balances] starting main subscription"),
        unsubscribe: () => {
          log.debug("[balances] stopping main subscription")
          // doing it on unsubscribe ensures we do not restart while subscriptions are active
          chaindataProvider.syncDynamicTokens()
        },
      })
    )
  }),
  shareReplay({ refCount: true, bufferSize: 1 }),
  keepAlive(3000)
)
