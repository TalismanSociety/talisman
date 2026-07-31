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
import { getBitcoinAccountTrees } from "../bitcoin/helpers"
import {
  type BitcoinAddressIndexData,
  bitcoinAddressIndexStore,
} from "../bitcoin/store.addressIndex"
import { keyringStore } from "../keyring/store"
import { balancesProvider } from "./balancesProvider"
import { activeNetworksStore, isNetworkActive } from "./store.activeNetworks"
import { activeTokensStore, isTokenActive } from "./store.activeTokens"
import { balancesStore$ } from "./store.balances"

// dual-tree metadata for HD bitcoin accounts: the ordinals xpub is not derivable from
// the account identity (payments xpub), so it must be supplied to the balance module.
// Issued fresh-address indexes ride along so incremental refreshes probe
// rotated-but-unused receive addresses, not just the first-unused frontier.
const getBtcAccountsMeta = (
  accounts: Account[],
  issuedIndexes: BitcoinAddressIndexData
): BtcAccountsMeta => {
  const meta: BtcAccountsMeta = {}
  for (const account of accounts) {
    if (
      account.type !== "hd-bitcoin" &&
      account.type !== "ledger-bitcoin" &&
      account.type !== "watch-only-bitcoin"
    )
      continue

    const trees = getBitcoinAccountTrees(account)
    if (!trees) continue

    const issued: Record<string, number> = {}
    for (const spec of trees)
      for (const chain of [0, 1] as const) {
        const index = issuedIndexes[`${spec.xpub}:${spec.tree}:${chain}`]
        if (index !== undefined) issued[`${spec.tree}:${chain}`] = index
      }

    meta[account.address] = {
      trees,
      ...(Object.keys(issued).length ? { issued } : {}),
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
  btcIssuedIndexes: bitcoinAddressIndexStore.observable,
}).pipe(
  map(({ networks, tokens, accounts, activeTokens, activeNetworks, btcIssuedIndexes }) => {
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

    return { addressesByTokenId, btcAccounts: getBtcAccountsMeta(accounts, btcIssuedIndexes) }
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
