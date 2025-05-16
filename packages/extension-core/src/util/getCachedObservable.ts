import type { Observable } from "rxjs"

const CACHE = new Map<string, Observable<unknown>>()

export const getCachedObservable$ = <T, Obs = Observable<T>>(
  key: string,
  create: () => Obs,
): Obs => {
  if (!CACHE.has(key)) CACHE.set(key, create() as Observable<unknown>)

  return CACHE.get(key) as Obs
}
