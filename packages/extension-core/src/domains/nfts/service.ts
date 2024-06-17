import { log } from "extension-shared"
import { BehaviorSubject, combineLatest, map } from "rxjs"

import { awaitKeyringLoaded } from "../../util/awaitKeyringLoaded"
import { fetchNfts } from "./fetchNfts"
import { getNftsAccountsList } from "./helpers"
import { nftsStore } from "./store"
import { NftData, NftLoadingStatus } from "./types"

const UPDATE_INTERVAL = 60 * 60 * 1000 // 1 hour
const UPDATE_CHECK_INTERVAL = 10 * 1000 // 10 seconds

const status = new BehaviorSubject<NftLoadingStatus>("stale")
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

const updateData = async () => {
  await awaitKeyringLoaded()

  const addresses = getNftsAccountsList()

  const { collections, nfts } = await fetchNfts(addresses)

  nftsStore.next({
    ...nftsStore.value,
    accountsKey: addresses.join(","),
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

    // ignore if an account has been removed, but refresh if one has been added
    const prevAccounts = nftsStore.value.accountsKey.split(",")
    const accounts = getNftsAccountsList()

    const requiresUpdateAccount = accounts.some((account) => !prevAccounts.includes(account))

    const requiresUpdateTimestamp =
      !nftsStore.value.timestamp || Date.now() - nftsStore.value.timestamp >= UPDATE_INTERVAL

    if (!requiresUpdateAccount && !requiresUpdateTimestamp) return

    status.next("loading")
    promise = updateData()
      .then(() => {
        status.next("loaded")
        errorsStreak = 0
      })
      .catch(() => {
        status.next("stale")
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

subscriptions.subscribe(async (subIds) => {
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

const obsNfts = combineLatest([nftsStore, status]).pipe(
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
  const subscription = obsNfts.subscribe((next) => {
    callback(next)
  })

  const id = addSubscription()

  return () => {
    removeSubscription(id)
    subscription.unsubscribe()
  }
}
