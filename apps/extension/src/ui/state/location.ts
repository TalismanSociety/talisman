import { fromEvent, map, merge, Observable, shareReplay } from "rxjs"

export const location$ = new Observable<Location>((subscriber) => {
  subscriber.next(window.location)

  // Override pushState and replaceState to capture programmatic navigations
  const originalPushState = history.pushState
  const originalReplaceState = history.replaceState

  const emitLocation = () => subscriber.next(window.location)

  history.pushState = function (...args) {
    originalPushState.apply(this, args)
    emitLocation()
  }

  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args)
    emitLocation()
  }

  // Listen to popstate and hashchange events
  const popstate$ = fromEvent(window, "popstate").pipe(map(() => window.location))
  const hashchange$ = fromEvent(window, "hashchange").pipe(map(() => window.location))

  const subscription = merge(popstate$, hashchange$).subscribe(subscriber)

  // Cleanup
  return () => {
    history.pushState = originalPushState
    history.replaceState = originalReplaceState
    subscription.unsubscribe()
  }
}).pipe(shareReplay(1))
