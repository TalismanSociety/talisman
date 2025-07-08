import { BalancesResult } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"
import { firstThenDebounce } from "@talismn/util"
import { fromPairs, isEqual } from "lodash"
import { combineLatest, distinctUntilChanged, map, shareReplay, switchMap } from "rxjs"
import { Address } from "viem"

import { chaindataProvider } from "../../rpcs/chaindata"
import { isAccountCompatibleWithNetwork } from "../accounts/helpers"
import { keyringStore } from "../keyring/store"
import { balancesProvider$ } from "./balancesProvider"
import { activeNetworksStore, isNetworkActive } from "./store.activeNetworks"
import { activeTokensStore, isTokenActive } from "./store.activeTokens"

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
        const networkAccounts = accounts.filter((a) => isAccountCompatibleWithNetwork(network, a))
        return networkTokens.map(
          (token) => [token.id, networkAccounts.map((a) => a.address)] as [TokenId, Address[]],
        )
      }),
    )
  }),
  distinctUntilChanged<Record<TokenId, Address[]>>(isEqual),
)

export const walletBalances$ = combineLatest({
  balancesProvider: balancesProvider$,
  addressesByTokenId: walletAddressesByTokenId$,
}).pipe(
  switchMap(({ balancesProvider, addressesByTokenId }) =>
    balancesProvider.getBalances$(addressesByTokenId),
  ),
  firstThenDebounce(200),
  distinctUntilChanged<BalancesResult>(isEqual),
  shareReplay({ refCount: true, bufferSize: 1 }),
)
