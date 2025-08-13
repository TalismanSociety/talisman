import { IChainConnectorDot } from "@talismn/chain-connectors"
import { DotNetworkId } from "@talismn/chaindata-provider"
import { isNotNil } from "@talismn/util"
import { toPairs } from "lodash-es"
import { Observable, of } from "rxjs"

import { QueryStorageChange, QueryStorageResult } from "./types"

export type MaybeStateKey = `0x${string}` | null

export type RpcQueryPack<T> = {
  stateKeys: MaybeStateKey[]
  decodeResult: (changes: MaybeStateKey[]) => T
}

type QueryStorageResultContent = QueryStorageResult[0]

export const fetchRpcQueryPack = async <T>(
  connector: IChainConnectorDot,
  networkId: DotNetworkId,
  queries: RpcQueryPack<T>[],
) => {
  const allStateKeys = queries.flatMap(({ stateKeys }) => stateKeys).filter(isNotNil)

  // doing a query without keys would throw an error => return early
  if (!allStateKeys.length)
    return queries.map(({ stateKeys, decodeResult }) => decodeResult(stateKeys.map(() => null)))

  const [result] = await connector.send<QueryStorageResult>(networkId, "state_queryStorageAt", [
    allStateKeys,
  ])

  return decodeRpcQueryPack(queries, result)
}

export const getRpcQueryPack$ = <T>(
  connector: IChainConnectorDot,
  networkId: DotNetworkId,
  queries: RpcQueryPack<T>[],
  timeout: number | false = false,
): Observable<T[]> => {
  const allStateKeys = queries.flatMap(({ stateKeys }) => stateKeys).filter(isNotNil)

  // doing a query without keys would throw an error => return early
  if (!allStateKeys.length)
    return of(queries.map(({ stateKeys, decodeResult }) => decodeResult(stateKeys.map(() => null))))

  return new Observable<T[]>((subscriber) => {
    // first subscription callback includes results for all state keys, but further callbacks will only include the ones that changed
    // => we need to keep all results in memory and update them after each callback, so we can emit the full result set each time
    const changesCache: Record<`0x${string}`, `0x${string}`> = {}

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
            changesCache[stateKey] = encodedResult

          // regenerate the full changes array
          const changes = toPairs(changesCache) as QueryStorageChange[]

          // decode and emit results for all queries
          subscriber.next(decodeRpcQueryPack(queries, { block: result.block, changes }))
        }
      },
      timeout,
    )

    return () => {
      promUnsub.then((unsub) => unsub("state_unsubscribeStorage"))
    }
  })
}

const decodeRpcQueryPack = <T>(
  queries: RpcQueryPack<T>[],
  result: QueryStorageResultContent,
): T[] => {
  return queries.reduce((acc, { stateKeys, decodeResult }) => {
    const changes = stateKeys.map((stateKey) => {
      if (!stateKey || !result) return null

      const change = result.changes.find(([key]) => key === stateKey)
      if (!change) return null

      return change[1]
    })

    acc.push(decodeResult(changes))

    return acc
  }, [] as T[])
}
