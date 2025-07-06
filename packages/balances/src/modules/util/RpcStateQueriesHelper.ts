import { ChainConnector } from "@talismn/chain-connector"
import { isNotNil } from "@talismn/util"

/**
 * Pass some these into an `RpcStateQueryHelper` in order to easily batch multiple state queries into the one rpc call.
 */
export type RpcQueryPack<T> = {
  stateKeys: (`0x${string}` | null)[]
  decodeResult: (changes: (`0x${string}` | null)[]) => T
}

export const fetchQueriesPack = async <T>(
  connector: ChainConnector,
  networkId: string,
  queries: RpcQueryPack<T>[],
) => {
  const allStateKeys = queries.flatMap(({ stateKeys }) => stateKeys).filter(isNotNil)

  // doing a query with only null keys would throw an error => return early
  if (!allStateKeys.length)
    return queries.map(({ stateKeys, decodeResult }) => decodeResult(stateKeys.map(() => null)))

  const response = await connector.send<
    { block: `0x${string}`; changes: [stateKey: `0x${string}`, value: `0x${string}`][] }[]
  >(networkId, "state_queryStorageAt", [allStateKeys])

  const results = queries.reduce((acc, { stateKeys, decodeResult }) => {
    const changes = stateKeys.map((stateKey) => {
      if (!stateKey) return null

      const change = response[0].changes.find(([key]) => key === stateKey)
      if (!change) return null

      return change[1]
    })

    acc.push(decodeResult(changes))

    return acc
  }, [] as T[])

  return results
}

/**
 * Used by a variety of balance modules to help batch multiple state queries into the one rpc call.
 */
// export class RpcStateQueriesHelper<T> {
//   #connector: ChainConnector
//   #queries: Array<RpcStateQueries<T>>

//   constructor(connector: ChainConnector, queries: Array<RpcStateQueries<T>>) {
//     this.#connector = connector
//     this.#queries = queries
//   }

//   async subscribe(
//     networkId: DotNetworkId,
//     callback: SubscriptionCallback<T[]>,
//     timeout: number | false = false,
//     subscribeMethod = "state_subscribeStorage",
//     responseMethod = "state_storage",
//     unsubscribeMethod = "state_unsubscribeStorage",
//   ): Promise<UnsubscribeFn> {
//     const params = [this.#queries.flatMap(({ stateKeys }) => stateKeys)]

//     const unsub = this.#connector.subscribe(
//       networkId,
//       subscribeMethod,
//       responseMethod,
//       params,
//       (error, result) => {
//         error
//           ? callback(error)
//           : callback(null, this.#distributeChangesToQueryDecoders.call(this, chainId, result))
//       },
//       timeout,
//     )

//     const subscriptions = queries.map(([chainId, queries]) => {
//       const params = [queries.map(({ stateKey }) => stateKey)]

//       const unsub = this.#connector.subscribe(
//         networkId,
//         subscribeMethod,
//         responseMethod,
//         params,
//         (error, result) => {
//           error
//             ? callback(error)
//             : callback(null, this.#distributeChangesToQueryDecoders.call(this, chainId, result))
//         },
//         timeout,
//       )

//       return () => unsub.then((unsubscribe) => unsubscribe(unsubscribeMethod))
//     })

//     return () => subscriptions.forEach((unsubscribe) => unsubscribe())
//   }

//   async fetch(method = "state_queryStorageAt"): Promise<T[]> {
//     const queriesByChain = groupBy(this.#queries, "chainId")

//     const resultsByChain = await Promise.all(
//       Object.entries(queriesByChain).map(async ([chainId, queries]) => {
//         const params = [queries.map(({ stateKey }) => stateKey)]

//         const result = (await this.#connector.send(chainId, method, params))[0]
//         return this.#distributeChangesToQueryDecoders.call(this, chainId, result)
//       }),
//     )

//     return resultsByChain.flatMap((result) => result)
//   }

//   #distributeChangesToQueryDecoders(chainId: DotNetworkId, result: unknown): T[] {
//     if (typeof result !== "object" || result === null) return []
//     if (!hasOwnProperty(result, "changes") || typeof result.changes !== "object") return []
//     if (!Array.isArray(result.changes)) return []

//     return result.changes.flatMap(([reference, change]: [unknown, unknown]): [T] | [] => {
//       if (typeof reference !== "string") {
//         log.warn(`Received non-string reference in RPC result: ${reference}`)
//         return []
//       }

//       if (typeof change !== "string" && change !== null) {
//         log.warn(`Received non-string and non-null change in RPC result: ${reference} | ${change}`)
//         return []
//       }

//       const query = this.#queries.find(
//         ({ chainId: cId, stateKey }) => cId === chainId && stateKey === reference,
//       )
//       if (!query) {
//         log.warn(
//           `Failed to find query:\n${reference} in\n${this.#queries.map(({ stateKey }) => stateKey)}`,
//         )
//         return []
//       }

//       return [query.decodeResult(change)]
//     })
//   }
// }
