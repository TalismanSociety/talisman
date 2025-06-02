import {
  Account,
  isAccountNotContact,
  isAccountPlatformEthereum,
  isAccountPlatformPolkadot,
} from "@talismn/keyring"
import { getQuery$, isNotNil } from "@talismn/util"
import { isEqual } from "lodash"
import {
  combineLatest,
  distinctUntilChanged,
  firstValueFrom,
  map,
  Observable,
  shareReplay,
  switchMap,
} from "rxjs"

import { keyringStore } from "../keyring/store"
import { fetchEvmAccountNfts } from "./fetchEvmAccountNfts"
import { fetchEvmNftRefresh } from "./fetchEvmNftRefresh"
import { nftsStore$, updateNftsStore } from "./store"
import { fetchDotAccountNfts } from "./subscan"
import { AccountNft, AccountNfts, Nft, NftData, NftLoadingStatus } from "./types"

const ONE_MINUTE = 60 * 1000

const UPDATE_INTERVAL = ONE_MINUTE // leverage cache on endpoint

const fetchAccountNfts = async (account: Account): Promise<AccountNfts> => {
  // some accounts may own both substrate and ethereum NFTs (ex: ethereum accounts that also own nfts on mythos)
  const results = await Promise.all(
    [
      isAccountPlatformEthereum(account) ? fetchEvmAccountNfts(account.address) : null,
      isAccountPlatformPolkadot(account) ? fetchDotAccountNfts(account) : null,
    ].filter(isNotNil),
  )

  return results.reduce(
    (acc, curr) => {
      return {
        nfts: acc.nfts.concat(...curr.nfts),
        collections: acc.collections.concat(...curr.collections),
      }
    },
    { nfts: [], collections: [] },
  )
}

export const nfts$ = new Observable<NftData>((subscriber) => {
  const updateData$ = keyringStore.accounts$.pipe(
    map((allAccounts) => allAccounts.filter(isAccountNotContact)),
    switchMap((accounts) =>
      combineLatest(
        accounts.map((account) =>
          getQuery$({
            queryKey: `nfts:${account.address}`,
            queryFn: () => fetchAccountNfts(account),
            refreshInterval: UPDATE_INTERVAL, // different interval per platform ?
          }).pipe(
            map((nftsData) => ({
              address: account.address,
              nftsData,
            })),
          ),
        ),
      ),
    ),
    map((accountsQueries) => {
      const status: NftLoadingStatus = accountsQueries.some((aq) => aq.nftsData.status === "error")
        ? "stale"
        : accountsQueries.every((aq) => aq.nftsData.status === "loaded")
          ? "loaded"
          : "loading"

      const loadedAddresses = accountsQueries
        .filter((aq) => aq.nftsData.status === "loaded")
        .map((a) => a.address)

      const loadedAccountsData = accountsQueries.reduce(
        (acc, curr) => {
          if (curr.nftsData.status !== "loaded") return acc
          acc.nfts.push(...curr.nftsData.data.nfts)
          acc.collections.push(...curr.nftsData.data.collections)
          return acc
        },
        { nfts: [], collections: [] } as AccountNfts,
      )

      return {
        status,
        loadedAddresses,
        ...loadedAccountsData,
      }
    }),
    distinctUntilChanged<{ status: NftLoadingStatus; loadedAddresses: string[] } & AccountNfts>(
      isEqual,
    ),
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
      map(([store, update]) => {
        const { collections, nfts, favoriteNftIds, hiddenNftCollectionIds } = store
        const data: NftData = {
          status: update.status,
          collections,
          nfts: mergeAccountNfts(nfts),
          favoriteNftIds,
          hiddenNftCollectionIds,
        }
        // console.log("[nfts] subOutput map", { store, update, data })
        return data
      }),
    )
    .subscribe(subscriber)

  return () => {
    subOutput.unsubscribe()
    subUpdateStore.unsubscribe()
  }
}).pipe(shareReplay({ bufferSize: 1, refCount: true }))

const mergeAccountNfts = (accountNfts: AccountNft[]): Nft[] => {
  const nfts: Nft[] = []

  for (const accountNft of accountNfts) {
    let nft = nfts.find((n) => n.id === accountNft.id)
    if (!nft) {
      nft = nftFromAccountNft(accountNft)
      nfts.push(nft)
    }
    nft.owners[accountNft.owner] = accountNft.amount
  }

  return nfts
}

const nftFromAccountNft = (accountNft: AccountNft): Nft => {
  const { owner, amount, ...rest } = accountNft
  return {
    ...rest,
    owners: { [owner]: amount },
  }
}

export const refreshNftMetadata = async (id: string) => {
  const store = await firstValueFrom(nftsStore$)
  const nft = store.nfts.find((nft) => nft.id === id)
  if (!nft) return

  if (nft.id.startsWith("subscan")) throw new Error("Polkadot NFTs cant be refreshed")

  return fetchEvmNftRefresh(id)
}
