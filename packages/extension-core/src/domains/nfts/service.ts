import { sleep } from "@talismn/util"
import { log } from "extension-shared"
import { isEqual } from "lodash"
import { BehaviorSubject, combineLatest, distinctUntilChanged, map } from "rxjs"

import { awaitKeyringLoaded } from "../../util/awaitKeyringLoaded"
import { fetchNfts } from "./fetchNfts"
import { fetchRefreshNftMetadata } from "./fetchRefreshNftMetadata"
import { getNftsAccountsList, getNftsNetworkIdsList } from "./helpers"
import { nftsStore$ } from "./store"
import { NftData, NftLoadingStatus } from "./types"

let UPDATE_INTERVAL = 60 * 60 * 1000 // 1 hour
const UPDATE_CHECK_INTERVAL = 10 * 1000 // 10 seconds

const status$ = new BehaviorSubject<NftLoadingStatus>("stale")
const subscriptions$ = new BehaviorSubject<string[]>([])
let watcher: Promise<() => void> | null = null

const addSubscription = () => {
  const subId = crypto.randomUUID()
  subscriptions$.next([...subscriptions$.value, subId])
  return subId
}

const removeSubscription = (subId: string) => {
  subscriptions$.next(subscriptions$.value.filter((id) => id !== subId))
}

const updateData = async () => {
  await awaitKeyringLoaded()

  const addresses = getNftsAccountsList()
  const evnNetworkIds = await getNftsNetworkIdsList()
  const { collections, nfts } = await fetchNfts(addresses, evnNetworkIds)

  nftsStore$.next({
    ...nftsStore$.value,
    accountsKey: addresses.join(","),
    networksKey: evnNetworkIds.join(","),
    nfts,
    collections,
    timestamp: Date.now(),
  })
}

const watchData = async () => {
  let stop = false
  let errorsStreak = 0

  // update every 1 hour
  let promise: Promise<void> | null = null

  await awaitKeyringLoaded()

  const checkOrUpdate = async () => {
    if (stop) return
    if (promise) return

    // ignore if a network has been removed, but refresh if one has been added
    const prevNetworkIds = nftsStore$.value.networksKey.split(",")
    const networkIds = await getNftsNetworkIdsList()
    const requiresUpdateNetwork = networkIds.some((id) => !prevNetworkIds.includes(id))

    // ignore if an account has been removed, but refresh if one has been added
    const prevAccounts = nftsStore$.value.accountsKey.split(",")
    const accounts = getNftsAccountsList()
    const requiresUpdateAccount = accounts.some((account) => !prevAccounts.includes(account))

    const requiresUpdateTimestamp =
      !nftsStore$.value.timestamp || Date.now() - nftsStore$.value.timestamp >= UPDATE_INTERVAL

    if (!requiresUpdateAccount && !requiresUpdateTimestamp && !requiresUpdateNetwork) return

    status$.next("loading")
    promise = updateData()
      .then(() => {
        status$.next("loaded")
        errorsStreak = 0
      })
      .catch(() => {
        status$.next("stale")
        errorsStreak++
        if (errorsStreak >= 3) stop = true
      })
      .finally(() => {
        promise = null
      })
  }

  const interval = setInterval(checkOrUpdate, UPDATE_CHECK_INTERVAL)

  checkOrUpdate()

  const unsubscribe = () => {
    watcher = null
    stop = true
    clearInterval(interval)
  }

  return unsubscribe
}

subscriptions$.subscribe(async (subIds) => {
  if (subIds.length === 0 && watcher) {
    try {
      watcher.then((unsubscribe) => unsubscribe())
    } catch (err) {
      log.error("Error unsubscribing from nft data", { err })
    }
  } else if (subIds.length && !watcher) {
    watcher = watchData()
  }
})

const nftsState$ = combineLatest([nftsStore$, status$]).pipe(
  map(([store, status]) => {
    const { collections, nfts, timestamp, favoriteNftIds, hiddenNftCollectionIds } = store
    const data: NftData = {
      collections,
      nfts,
      timestamp,
      status,
      favoriteNftIds,
      hiddenNftCollectionIds,
    }
    return data
  })
)

export const subscribeNfts = (callback: (data: NftData) => void) => {
  const subscription = nftsState$.subscribe((next) => {
    callback(next)
  })

  const id = addSubscription()

  return () => {
    removeSubscription(id)
    subscription.unsubscribe()
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

export const refreshNftMetadata = async (id: string) => {
  const nft = nftsStore$.value.nfts.find((n) => n.id === id)
  if (!nft) return

  const { evmNetworkId, contract, tokenId } = nft

  await fetchRefreshNftMetadata(evmNetworkId, contract.address, tokenId)

  // force an update after 10 seconds, might be lucky !
  await sleep(10_000)
  updateData()

  // we don't know when the refresh will be done, lower the update interval to 10 minute for this session
  UPDATE_INTERVAL = 60 * 1000
}

// reset the update interval to 1 hour, if we detect any changes
nftsStore$
  .pipe(
    map(({ nfts, collections }) => ({ nfts, collections })),
    distinctUntilChanged(isEqual)
  )
  .subscribe(() => {
    UPDATE_INTERVAL = 60 * 60 * 1000
  })
