import { ChainConnector } from "@talismn/chain-connector"
import { DotNetworkId } from "@talismn/chaindata-provider"
import { isNotNil } from "@talismn/util"
import { Observable, of } from "rxjs"

type MaybeStateKey = `0x${string}` | null

export type RpcQueryPack<T> = {
  stateKeys: MaybeStateKey[]
  decodeResult: (changes: MaybeStateKey[]) => T
}

type RpcQueryResult = {
  block: `0x${string}`
  changes: [stateKey: `0x${string}`, value: `0x${string}` | null][]
}

export const fetchRpcQueryPack = async <T>(
  connector: ChainConnector,
  networkId: DotNetworkId,
  queries: RpcQueryPack<T>[],
) => {
  const allStateKeys = queries.flatMap(({ stateKeys }) => stateKeys).filter(isNotNil)

  // doing a query without keys would throw an error => return early
  if (!allStateKeys.length)
    return queries.map(({ stateKeys, decodeResult }) => decodeResult(stateKeys.map(() => null)))

  const [result] = await connector.send<[RpcQueryResult]>(networkId, "state_queryStorageAt", [
    allStateKeys,
  ])

  return decodeRpcQueryPack(queries, result)
}

export const getRpcQueryPack$ = <T>(
  connector: ChainConnector,
  networkId: DotNetworkId,
  queries: RpcQueryPack<T>[],
  timeout: number | false = false,
): Observable<T[]> => {
  const allStateKeys = queries.flatMap(({ stateKeys }) => stateKeys).filter(isNotNil)

  // doing a query without keys would throw an error => return early
  if (!allStateKeys.length)
    return of(queries.map(({ stateKeys, decodeResult }) => decodeResult(stateKeys.map(() => null))))

  return new Observable<T[]>((subscriber) => {
    const promUnsub = connector.subscribe(
      networkId,
      "state_subscribeStorage",
      "state_storage",
      [allStateKeys],
      (error, result: RpcQueryResult) => {
        if (error) subscriber.error(error)
        else subscriber.next(decodeRpcQueryPack(queries, result))
      },
      timeout,
    )

    return () => {
      promUnsub.then((unsub) => unsub("state_unsubscribeStorage"))
    }
  })
}

const decodeRpcQueryPack = <T>(queries: RpcQueryPack<T>[], result: RpcQueryResult): T[] => {
  return queries.reduce((acc, { stateKeys, decodeResult }) => {
    const changes = stateKeys.map((stateKey) => {
      if (!stateKey) return null

      const change = result.changes.find(([key]) => key === stateKey)
      if (!change) return null

      return change[1]
    })

    acc.push(decodeResult(changes))

    return acc
  }, [] as T[])
}
