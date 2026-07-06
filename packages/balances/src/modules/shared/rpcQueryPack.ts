import type { IChainConnectorDot } from "@talismn/chain-connectors"
import type { DotNetworkId } from "@talismn/chaindata-provider"
import { type ChunkedOptions, isNotNil, mapWithYield, switchMapChunked } from "@talismn/util"
import { Observable, of } from "rxjs"

import type { QueryStorageResult } from "./types"

export type MaybeStateKey = `0x${string}` | null

export type RpcQueryPack<T> = {
  stateKeys: MaybeStateKey[]
  decodeResult: (changes: MaybeStateKey[]) => T
}

type QueryStorageResultContent = QueryStorageResult[0]

type ChangesByKey = ReadonlyMap<`0x${string}`, `0x${string}`>

export const fetchRpcQueryPack = async <T>(
  connector: IChainConnectorDot,
  networkId: DotNetworkId,
  queries: RpcQueryPack<T>[]
) => {
  const allStateKeys = queries.flatMap(({ stateKeys }) => stateKeys).filter(isNotNil)

  // doing a query without keys would throw an error => return early
  if (!allStateKeys.length)
    return queries.map(({ stateKeys, decodeResult }) => decodeResult(stateKeys.map(() => null)))

  const [result] = await connector.send<QueryStorageResult>(networkId, "state_queryStorageAt", [
    allStateKeys,
  ])

  return decodeRpcQueryPackChunked(queries, result ? new Map(result.changes) : null)
}

/**
 * Wraps the raw state_subscribeStorage subscription and emits, for every storage change
 * callback, a SNAPSHOT of the accumulated changes keyed by state key.
 *
 * A snapshot (shallow copy of string refs, cheap) is required because decoding is chunked
 * and asynchronous: a later websocket callback must not mutate the map that an in-flight
 * decode is reading.
 */
const getRawStorageUpdates$ = (
  connector: IChainConnectorDot,
  networkId: DotNetworkId,
  allStateKeys: `0x${string}`[],
  timeout: number | false
): Observable<ChangesByKey> =>
  new Observable<ChangesByKey>((subscriber) => {
    // first subscription callback includes results for all state keys, but further callbacks will only include the ones that changed
    // => we need to keep all results in memory and update them after each callback, so we can emit the full result set each time
    const changesCache = new Map<`0x${string}`, `0x${string}`>()

    const promUnsub = connector.subscribe(
      networkId,
      "state_subscribeStorage",
      "state_storage",
      [allStateKeys],
      (error, result: QueryStorageResultContent) => {
        if (error) subscriber.error(error)
        else if (result) {
          // update the cache
          for (const [stateKey, encodedResult] of result.changes)
            changesCache.set(stateKey, encodedResult)

          subscriber.next(new Map(changesCache))
        }
      },
      timeout
    )

    return () => {
      promUnsub.then((unsub) => unsub("state_unsubscribeStorage"))
    }
  })

export const getRpcQueryPack$ = <T>(
  connector: IChainConnectorDot,
  networkId: DotNetworkId,
  queries: RpcQueryPack<T>[],
  timeout: number | false = false
): Observable<T[]> => {
  const allStateKeys = queries.flatMap(({ stateKeys }) => stateKeys).filter(isNotNil)

  // doing a query without keys would throw an error => return early
  if (!allStateKeys.length)
    return of(queries.map(({ stateKeys, decodeResult }) => decodeResult(stateKeys.map(() => null))))

  // decode and emit results for all queries, chunked with latest-wins semantics: the
  // per-query SCALE decode yields the thread on budget, and when a new block's changes
  // arrive mid-decode the in-flight decode is aborted (the new snapshot contains the
  // aborted block's changes too, so nothing is lost — emissions coalesce under load)
  return getRawStorageUpdates$(connector, networkId, allStateKeys, timeout).pipe(
    switchMapChunked((changesByKey, { slicer }) =>
      decodeRpcQueryPackChunked(queries, changesByKey, { slicer })
    )
  )
}

const decodeRpcQueryPackChunked = <T>(
  queries: RpcQueryPack<T>[],
  changesByKey: ChangesByKey | null,
  options?: ChunkedOptions
): Promise<T[]> =>
  mapWithYield(
    queries,
    ({ stateKeys, decodeResult }) =>
      decodeResult(stateKeys.map((stateKey) => (stateKey && changesByKey?.get(stateKey)) ?? null)),
    options
  )
