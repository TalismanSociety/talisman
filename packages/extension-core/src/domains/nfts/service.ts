import { isAccountEthereum, isAccountNotContact } from "@talismn/keyring"
import { getQuery$, QueryResult, QueryStatus, sleep } from "@talismn/util"
import { DEBUG } from "extension-shared"
import { isEqual } from "lodash"
import { combineLatest, distinctUntilChanged, map, Observable, switchMap } from "rxjs"

import { activeEvmNetworksObservable } from "../balances/pool"
import { keyringStore } from "../keyring/store"
import { fetchNfts } from "./fetchNfts"
import { fetchRefreshNftMetadata } from "./fetchRefreshNftMetadata"
import { nftsStore$ } from "./store"
import { FetchNftsResponse, NftData } from "./types"

const TEN_SECONDS = 60 * 1000
const ONE_MINUTE = 60 * 1000
const ONE_HOUR = 60 * ONE_MINUTE

// const UPDATE_CHECK_INTERVAL = TEN_SECONDS
const DEFAULT_UPDATE_INTERVAL = DEBUG ? TEN_SECONDS : ONE_HOUR

const UPDATE_INTERVAL = DEFAULT_UPDATE_INTERVAL // can be changed based on context

export const nfts$ = new Observable<NftData>((subscriber) => {
  const addresses$ = keyringStore.accounts$.pipe(
    map((accounts) =>
      accounts
        .filter(isAccountNotContact)
        .filter(isAccountEthereum)
        .map((a) => a.address)
        .sort(),
    ),
    distinctUntilChanged<string[]>(isEqual),
  )

  const activeNetworkIds$ = activeEvmNetworksObservable.pipe(
    map((networks) => networks.map((n) => n.id).sort()),
    distinctUntilChanged<string[]>(isEqual),
  )

  const nftsData$ = addresses$.pipe(
    switchMap((addresses) =>
      getQuery$({
        queryKey: ["nftsData$", ...addresses].join(":"),
        queryFn: () => fetchNfts(addresses),
        refreshInterval: UPDATE_INTERVAL,
      }),
    ),
    distinctUntilChanged<QueryResult<FetchNftsResponse>>(isEqual),
  )

  const subUpdateStore = combineLatest([addresses$, nftsData$, activeNetworkIds$]).subscribe(
    ([addresses, nftsData, evmNetworkIds]) => {
      if (nftsData.status === "loaded")
        nftsStore$.next({
          ...nftsStore$.value,
          accountsKey: addresses.join(","),
          networksKey: evmNetworkIds.join(","),
          ...nftsData.data,
          timestamp: Date.now(),
        })
    },
  )

  const subOutput = combineLatest([nftsStore$, nftsData$.pipe(map((loadable) => loadable.status))])
    .pipe(
      map(([store, status]) => {
        const { collections, nfts, timestamp, favoriteNftIds, hiddenNftCollectionIds } = store
        const data: NftData = {
          collections,
          nfts,
          timestamp,
          status: queryStatusToNftStatus(status),
          favoriteNftIds,
          hiddenNftCollectionIds,
        }
        return data
      }),
    )
    .subscribe(subscriber)

  return () => {
    subOutput.unsubscribe()
    subUpdateStore.unsubscribe()
  }
})

const queryStatusToNftStatus = (status: QueryStatus): NftData["status"] => {
  switch (status) {
    case "loading":
    case "loaded":
      return status
    case "error":
      return "stale"
  }
}

export const setHiddenNftCollection = (id: string, isHidden: boolean) => {
  const hiddenNftCollectionIds = nftsStore$.value.hiddenNftCollectionIds.filter((cid) => cid !== id)
  if (isHidden) hiddenNftCollectionIds.push(id)

  nftsStore$.next({
    ...nftsStore$.value,
    hiddenNftCollectionIds,
  })
}

export const setFavoriteNft = (id: string, isFavorite: boolean) => {
  const favoriteNftIds = nftsStore$.value.favoriteNftIds.filter((nid) => nid !== id)
  if (isFavorite) favoriteNftIds.push(id)

  nftsStore$.next({
    ...nftsStore$.value,
    favoriteNftIds,
  })
}

// TODO doesnt work yet
export const refreshNftMetadata = async (id: string) => {
  const nft = nftsStore$.value.nfts.find((n) => n.id === id)
  if (!nft) return

  const { networkId, contract, tokenId } = nft

  await fetchRefreshNftMetadata(networkId, contract, tokenId)

  // force an update after 15 seconds, might be lucky !
  await sleep(15_000)
  // updateData()

  // we don't know when the refresh will be done, lower the update interval to 10 minute for this session
  // UPDATE_INTERVAL = 60 * 1000
}
