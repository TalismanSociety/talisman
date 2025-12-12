import { log } from "extension-shared"
import { isEqual } from "lodash-es"
import { debounceTime, map, pairwise, ReplaySubject } from "rxjs"

import { getBlobStore } from "../../db"
import { walletReady } from "../../libs/isWalletReady"
import { YieldxyzProvider } from "./types"

const blobStore = getBlobStore<YieldxyzProvider[]>("yieldxyz-providers")

const DEFAULT_DATA: YieldxyzProvider[] = []

const subjectYieldxyzProvidersStore$ = new ReplaySubject<YieldxyzProvider[]>(1)

walletReady.then(async () => {
  try {
    const data = await blobStore.get()
    subjectYieldxyzProvidersStore$.next(data ?? DEFAULT_DATA)
  } catch (error) {
    log.error("[yield.xyz] Error fetching providers:", error)
    subjectYieldxyzProvidersStore$.next(DEFAULT_DATA)
  }
})

// normalize function to order items consistently, so we can use isEqual reliably
const normalizeYieldxyzProviders = (items: YieldxyzProvider[]): YieldxyzProvider[] => {
  return items.concat().sort((a, b) => a.id.localeCompare(b.id))
}

// persist to db when store is updated
subjectYieldxyzProvidersStore$
  .pipe(debounceTime(500), map(normalizeYieldxyzProviders), pairwise())
  .subscribe(async ([prev, items]) => {
    try {
      if (!isEqual(prev, items)) await blobStore.set(items)
    } catch (error) {
      log.error("[yield.xyz] Error saving yield providers:", error)
    }
  })

export const yieldxyzProvidersStore$ = subjectYieldxyzProvidersStore$.asObservable()

export const updateYieldxyzProvidersStore = (items: YieldxyzProvider[]) => {
  subjectYieldxyzProvidersStore$.next(items)
}
