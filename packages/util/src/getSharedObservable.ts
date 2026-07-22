import { Observable, shareReplay } from "rxjs"

type CacheEntry = {
  observable: unknown
  refCount: number
  cleanupTimer: ReturnType<typeof setTimeout> | null
}

const CACHE = new Map<string, CacheEntry>()

/**
 * How long an entry survives with no subscribers before being dropped. Long enough
 * for quick unmount/remount cycles (navigation, react-rxjs Subscribe boundaries) to
 * reuse the entry, short enough that abandoned scopes (e.g. superseded balance
 * subscriptions after networks/accounts change) don't accumulate forever.
 */
const CLEANUP_DELAY_MS = 60_000

/**
 * When using react-rxjs hooks and state observables, the options are used as weak map keys.
 * This means that if the options object is recreated on each render, the observable will be recreated as well.
 * This utility function allows you to create a shared observable based on a namespace and arguments that, so react-rxjs can reuse the same observables
 *
 * Entries are reference-counted: an entry with no subscribers for CLEANUP_DELAY_MS is
 * removed from the cache (its shareReplay source is already torn down by refCount at
 * that point — only the replay buffer and the entry itself are dropped).
 *
 * @param namespace
 * @param args
 * @param createObservable
 * @param serializer
 * @returns
 */
export const getSharedObservable = <Args, Output, ObsOutput = Observable<Output>>(
  namespace: string,
  args: Args,
  createObservable: (args: Args) => ObsOutput,
  serializer = (args: Args): string => JSON.stringify(args)
): ObsOutput => {
  const cacheKey = `${namespace}:${serializer(args)}`

  const cached = CACHE.get(cacheKey)
  if (cached) return cached.observable as ObsOutput

  const obs = createObservable(args) as Observable<unknown>
  const sharedObs = obs.pipe(shareReplay({ bufferSize: 1, refCount: true }))

  const scheduleCleanup = (entry: CacheEntry) => {
    if (entry.cleanupTimer) clearTimeout(entry.cleanupTimer)
    entry.cleanupTimer = setTimeout(() => {
      if (entry.refCount === 0 && CACHE.get(cacheKey) === entry) CACHE.delete(cacheKey)
    }, CLEANUP_DELAY_MS)
  }

  const entry: CacheEntry = {
    observable: null,
    refCount: 0,
    cleanupTimer: null,
  }

  entry.observable = new Observable((subscriber) => {
    entry.refCount++
    if (entry.cleanupTimer) {
      clearTimeout(entry.cleanupTimer)
      entry.cleanupTimer = null
    }

    const subscription = sharedObs.subscribe(subscriber)

    return () => {
      subscription.unsubscribe()
      entry.refCount--
      if (entry.refCount === 0) scheduleCleanup(entry)
    }
  })

  CACHE.set(cacheKey, entry)
  // entries requested but never subscribed to must not linger either
  scheduleCleanup(entry)

  return entry.observable as ObsOutput
}
