import { ChainConnector } from "@talismn/chain-connector"
import { ChainId } from "@talismn/chaindata-provider"
import { hasOwnProperty } from "@talismn/util"
import groupBy from "lodash/groupBy"

import log from "../../log"
import { SubscriptionCallback, UnsubscribeFn } from "../../types"

/**
 * Pass some these into an `RpcStateQueryHelper` in order to easily batch multiple state queries into the one rpc call.
 */
export type RpcStateQuery<T> = {
  chainId: string
  stateKey: string
  decodeResult: (change: string | null) => T
}

/**
 * Used by a variety of balance modules to help batch multiple state queries into the one rpc call.
 */
export class RpcStateQueryHelper<T> {
  #chainConnector: ChainConnector
  #queries: Array<RpcStateQuery<T>>

  constructor(chainConnector: ChainConnector, queries: Array<RpcStateQuery<T>>) {
    this.#chainConnector = chainConnector
    this.#queries = queries
  }

  async subscribe(
    callback: SubscriptionCallback<T[]>,
    timeout: number | false = false,
    subscribeMethod = "state_subscribeStorage",
    responseMethod = "state_storage",
    unsubscribeMethod = "state_unsubscribeStorage",
  ): Promise<UnsubscribeFn> {
    const queriesByChain = groupBy(this.#queries, "chainId")
    const subscriptions = Object.entries(queriesByChain).map(([chainId, queries]) => {
      const params = [queries.map(({ stateKey }) => stateKey)]

      const unsub = this.#chainConnector.subscribe(
        chainId,
        subscribeMethod,
        responseMethod,
        params,
        (error, result) => {
          error
            ? callback(error)
            : callback(null, this.#distributeChangesToQueryDecoders.call(this, chainId, result))
        },
        timeout,
      )

      return () => unsub.then((unsubscribe) => unsubscribe(unsubscribeMethod))
    })

    return () => subscriptions.forEach((unsubscribe) => unsubscribe())
  }

  async fetch(method = "state_queryStorageAt"): Promise<T[]> {
    const queriesByChain = groupBy(this.#queries, "chainId")

    const resultsByChain = await Promise.all(
      Object.entries(queriesByChain).map(async ([chainId, queries]) => {
        const params = [queries.map(({ stateKey }) => stateKey)]

        const result = (await this.#chainConnector.send(chainId, method, params))[0]
        return this.#distributeChangesToQueryDecoders.call(this, chainId, result)
      }),
    )

    return resultsByChain.flatMap((result) => result)
  }

  #distributeChangesToQueryDecoders(chainId: ChainId, result: unknown): T[] {
    if (typeof result !== "object" || result === null) return []
    if (!hasOwnProperty(result, "changes") || typeof result.changes !== "object") return []
    if (!Array.isArray(result.changes)) return []

    return result.changes.flatMap(([reference, change]: [unknown, unknown]): [T] | [] => {
      if (typeof reference !== "string") {
        log.warn(`Received non-string reference in RPC result: ${reference}`)
        return []
      }

      if (typeof change !== "string" && change !== null) {
        log.warn(`Received non-string and non-null change in RPC result: ${reference} | ${change}`)
        return []
      }

      const query = this.#queries.find(
        ({ chainId: cId, stateKey }) => cId === chainId && stateKey === reference,
      )
      if (!query) {
        log.warn(
          `Failed to find query:\n${reference} in\n${this.#queries.map(({ stateKey }) => stateKey)}`,
        )
        return []
      }

      return [query.decodeResult(change)]
    })
  }
}
