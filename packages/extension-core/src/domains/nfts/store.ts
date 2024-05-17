import { log } from "extension-shared"
import { BehaviorSubject, combineLatest, map } from "rxjs"

import { Nft, NftCollection } from "./types"

const UPDATE_INTERVAL = 60 * 60 * 1000 // 1 hour
const UPDATE_CHECK_INTERVAL = 10 * 1000 // 10 seconds

type NftStoreData = {
  id: "nfts"
  timestamp: number | null
  // status: "stale" | "loading" | "loaded"
  collections: NftCollection[]
  nfts: Nft[]
}

type LoadingStatus = "stale" | "loading" | "loaded"
export type NftData = Omit<NftStoreData, "id"> & {
  status: "stale" | "loading" | "loaded"
}

const DEFAULT_DATA: NftStoreData = {
  id: "nfts",
  timestamp: null,
  // status: "stale",
  collections: [],
  nfts: [],
}

const store = new BehaviorSubject(DEFAULT_DATA)
const status = new BehaviorSubject<LoadingStatus>("stale")
const subscriptions = new BehaviorSubject<string[]>([])
let watcher: Promise<() => void> | null = null

const addSubscription = () => {
  const subId = crypto.randomUUID()
  subscriptions.next([...subscriptions.value, subId])
  return subId
}

const removeSubscription = (subId: string) => {
  subscriptions.next(subscriptions.value.filter((id) => id !== subId))
}

const updateData = async () => {}

const watchData = async () => {
  let stop = false

  // update every 1 hour
  let promise: Promise<void> | null = null

  const interval = setInterval(() => {
    if (stop) return
    if (promise) return
    if (!store.value.timestamp || Date.now() - store.value.timestamp < UPDATE_INTERVAL) return

    status.next("loading")
    promise = updateData()
      .then(() => {
        promise = null
        status.next("loaded")
      })
      .catch(() => {
        status.next("stale")
      })
  }, UPDATE_CHECK_INTERVAL)

  const unsubscribe = () => {
    watcher = null
    stop = true
    clearInterval(interval)
  }

  return unsubscribe
}

subscriptions.subscribe(async (subIds) => {
  if (subIds.length === 0 && watcher) {
    try {
      watcher.then((unsubscribe) => unsubscribe())
    } catch (err) {
      log.error("Error unsubscribing from nft data", { err })
    }
  } else if (!watcher) {
    watcher = watchData()
  }
})

const obsNfts = combineLatest([store, status]).pipe(
  map(([store, status]) => {
    const { collections, nfts, timestamp } = store
    const data: NftData = {
      collections,
      nfts,
      timestamp,
      status,
    }
    return data
  })
)

export const subscribeNfts = (callback: (data: NftData) => void) => {
  const id = addSubscription()

  const subscription = obsNfts.subscribe(callback)

  subscriptions.next([...subscriptions.value, id])

  return () => {
    removeSubscription(id)
    subscription.unsubscribe()
  }
}
