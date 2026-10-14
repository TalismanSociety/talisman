import { log } from "@common/log"
import {
  type Account,
  isAccountNotContact,
  isAccountPlatformEthereum,
  isAccountPlatformPolkadot,
} from "@talismn/keyring"
import { getQuery$, isNotNil, keepAlive, type QueryResult } from "@talismn/util"
import { isEqual, uniq } from "lodash-es"
import {
  combineLatest,
  distinctUntilChanged,
  first,
  firstValueFrom,
  map,
  Observable,
  shareReplay,
  switchMap,
  tap,
} from "rxjs"

import { keyringStore } from "../keyring/store"
import { getDotAccountNfts$ } from "./fetchDotAccountNfts"
import { fetchEvmAccountNfts } from "./fetchEvmAccountNfts"
import { fetchEvmNftRefresh } from "./fetchEvmNftRefresh"
import { nftsStore$, updateNftsStore } from "./store"
import type { AccountNft, AccountNfts, Nft, NftData, NftLoadingStatus } from "./types"

const ONE_MINUTE = 60 * 1000

const getEvmAccountNfts$ = (account: Account) =>
  getQuery$({
    namespace: "nfts-evm",
    args: account,
    queryFn: (account, signal) => fetchEvmAccountNfts(account.address, signal),
    refreshInterval: ONE_MINUTE,
  })

// some accounts may own both substrate and ethereum NFTs (ex: ethereum accounts that also own nfts on mythos)
const getAccountNftsBySource$ = (account: Account): Observable<QueryResult<AccountNfts>>[] =>
  [
    isAccountPlatformEthereum(account) ? getEvmAccountNfts$(account) : null,
    isAccountPlatformPolkadot(account) ? getDotAccountNfts$(account) : null,
  ].filter(isNotNil)

export const nfts$ = new Observable<NftData>((subscriber) => {
  log.log("Opening NFTs subscription")

  const nftsCountByAccount$ = nftsStore$.pipe(
    map(({ nfts }) =>
      nfts.reduce(
        (acc, nft) => {
          if (!acc[nft.owner]) acc[nft.owner] = 0
          acc[nft.owner]++
          return acc
        },
        {} as Record<string, number>
      )
    ),
    first() // take only the first value to not retrigger sub if more nfts are added to the store
  )

  const updateData$ = combineLatest([keyringStore.accounts$, nftsCountByAccount$]).pipe(
    map(([allAccounts, nftsByAccount]) =>
      allAccounts
        .filter(isAccountNotContact)
        // sort accounts by number of nfts so newly created accounts are prioritised
        .sort((a1, a2) => (nftsByAccount[a1.address] ?? 0) - (nftsByAccount[a2.address] ?? 0))
        // but prioritise evm accounts as they only need 1 request each
        .sort(
          (a1, a2) =>
            (isAccountPlatformEthereum(a2) ? 1 : 0) - (isAccountPlatformEthereum(a1) ? 1 : 0)
        )
    ),
    switchMap((accounts) => {
      const accountsQueries = accounts.flatMap((account) =>
        getAccountNftsBySource$(account).map((nftsData$) =>
          nftsData$.pipe(map((nftsData) => ({ address: account.address, nftsData })))
        )
      )
      return combineLatest(accountsQueries)
    }),
    map((accountsQueries) => {
      const status: NftLoadingStatus = accountsQueries.some((aq) => aq.nftsData.status === "error")
        ? "stale"
        : accountsQueries.every((aq) => aq.nftsData.status === "loaded")
          ? "loaded"
          : "loading"

      const loadedAddresses = uniq(accountsQueries.map((aq) => aq.address)).filter((address) =>
        accountsQueries.every((aq) => aq.address !== address || aq.nftsData.status === "loaded")
      )

      const loadedAccountsData = accountsQueries.reduce(
        (acc, curr) => {
          if (curr.nftsData.status !== "loaded" || !loadedAddresses.includes(curr.address))
            return acc
          acc.nfts.push(...curr.nftsData.data.nfts)
          acc.collections.push(...curr.nftsData.data.collections)
          return acc
        },
        { nfts: [], collections: [] } as AccountNfts
      )

      return {
        status,
        loadedAddresses,
        ...loadedAccountsData,
      }
    }),
    distinctUntilChanged<{ status: NftLoadingStatus; loadedAddresses: string[] } & AccountNfts>(
      isEqual
    )
  )

  const subUpdateStore = updateData$.subscribe((data) => {
    updateNftsStore({
      addresses: data.loadedAddresses,
      nfts: data.nfts,
      collections: data.collections,
    })
  })

  const subOutput = combineLatest([nftsStore$, updateData$])
    .pipe(
      map(([store, update]): NftData => {
        const { collections, nfts, favoriteNftIds, hiddenNftCollectionIds } = store
        return {
          status: update.status,
          collections,
          nfts: mergeAccountNfts(nfts),
          favoriteNftIds,
          hiddenNftCollectionIds,
        }
      })
    )
    .subscribe(subscriber)

  return () => {
    log.log("Closing NFTs subscription")
    subOutput.unsubscribe()
    subUpdateStore.unsubscribe()
  }
}).pipe(
  tap({
    subscribe: () => log.debug("[nfts] starting main subscription"),
    unsubscribe: () => log.debug("[nfts] stopping main subscription"),
  }),
  shareReplay({ refCount: true, bufferSize: 1 }),
  keepAlive(3000)
)

const mergeAccountNfts = (accountNfts: AccountNft[]): Nft[] => {
  const nfts: Nft[] = []

  for (const accountNft of accountNfts) {
    const { owner, amount, ...rest } = accountNft

    let nft = nfts.find((n) => n.id === accountNft.id)
    if (!nft) {
      nft = { ...rest, owners: {} }
      nfts.push(nft)
    }

    nft.owners[owner] = amount
  }

  return nfts
}

export const refreshNftMetadata = async (id: string) => {
  const store = await firstValueFrom(nftsStore$)
  const nft = store.nfts.find((nft) => nft.id === id)
  if (!nft) return

  if (nft.id.startsWith("substrate:")) throw new Error("Polkadot NFTs cant be refreshed")

  return fetchEvmNftRefresh(id)
}
