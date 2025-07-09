import { Observable, shareReplay } from "rxjs"

const CACHE = new Map<string, unknown>()

/**
 * When using react-rxjs hooks and state observables, the options are used as weak map keys.
 * This means that if the options object is recreated on each render, the observable will be recreated as well.
 * This utility function allows you to create a shared observable based on a namespace and arguments that, so react-rxjs can reuse the same observables
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
  serializer = (args: Args): string => JSON.stringify(args),
): ObsOutput => {
  const cacheKey = `${namespace}:${serializer(args)}`

  if (CACHE.has(cacheKey)) return CACHE.get(cacheKey) as ObsOutput

  const obs = createObservable(args) as Observable<unknown>
  const sharedObs = obs.pipe(shareReplay({ bufferSize: 1, refCount: true }))

  CACHE.set(cacheKey, sharedObs)

  return sharedObs as ObsOutput
}
