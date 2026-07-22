import { DEBUG } from "@common/constants"
import { log } from "@common/log"
import type { Address, BtcAccountsMeta } from "@talismn/balances"
import type { TokenId } from "@talismn/chaindata-provider"
import { type Account, isAccountNotContact } from "@talismn/keyring"
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

// dual-tree metadata for HD bitcoin accounts: the ordinals xpub is not derivable from
// the account identity (payments xpub), so it must be supplied to the balance module
const getBtcAccountsMeta = (accounts: Account[]): BtcAccountsMeta => {
  const meta: BtcAccountsMeta = {}
  for (const account of accounts) {
    if (account.type === "hd-bitcoin" || account.type === "ledger-bitcoin")
      meta[account.address] = {
        trees: [
          { tree: "payments", xpub: account.keys.payments.xpub, addressType: "p2wpkh" },
          { tree: "ordinals", xpub: account.keys.ordinals.xpub, addressType: "p2tr" },
        ],
      }
    else if (account.type === "watch-only-bitcoin")
      meta[account.address] = {
        trees: [{ tree: "payments", xpub: account.address, addressType: account.addressType }],
      }
  }
  return meta
}

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

    const addressesByTokenId = fromPairs(
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

    return { addressesByTokenId, btcAccounts: getBtcAccountsMeta(accounts) }
  }),
  distinctUntilChanged<{
    addressesByTokenId: Record<TokenId, Address[]>
    btcAccounts: BtcAccountsMeta
  }>(isEqual)
)

export const walletBalances$ = settingsStore.observable.pipe(
  map((settings) => DEBUG && settings.disableBalanceFetching),
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
      // coalesce bursts of scope changes (asset-discovery activations, dynamic-token
      // sync, chaindata updates): every emission below restarts the whole balances
      // aggregation, so a burst must collapse into a single restart. First emission
      // passes through untouched to keep startup instant.
      firstThenDebounce(1_000),
      switchMap(({ addressesByTokenId, btcAccounts }) =>
        balancesProvider.getBalances$(addressesByTokenId, { btcAccounts })
      ),
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
