import { liveQuery } from "dexie"
import { db, DiscoveredBalance } from "extension-core"
import { from, Observable, throttleTime } from "rxjs"

export const assetDiscoveryBalances$ = new Observable<DiscoveredBalance[]>((subscriber) => {
  const sub = from(liveQuery(() => db.assetDiscovery.toArray()))
    .pipe(throttleTime(500, undefined, { leading: true, trailing: true }))
    .subscribe(subscriber)

  return () => sub.unsubscribe()
})

// export const assetDiscoveryScanAtom = atomWithObservable(() =>
//     assetDiscoveryStore.observable.pipe(logObservableUpdate("assetDiscoveryScanAtom"))
//   )
