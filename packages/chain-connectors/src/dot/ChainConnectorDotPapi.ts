import type { DotNetworkId } from "@talismn/chaindata-provider"

import log from "../log"
import { StaleRpcError } from "./ChainConnectorDot"
import type { IChainConnectorDot, SubscriptionCallback } from "./IChainConnectorDot"

const RESPONSE_TIMEOUT = 30_000
const STALE_AFTER = 60_000

type HexString = `0x${string}`
type StorageChanges = { block: HexString; changes: [HexString, HexString | null][] }

/** The parts of a polkadot-api `PolkadotClient` that the connector uses */
export type PapiClient = {
  _request: <Reply>(method: string, params: unknown[]) => Promise<Reply>
  bestBlocks$: {
    subscribe: (observer: {
      next: (blocks: { hash: string }[]) => void
      error: (error: unknown) => void
    }) => { unsubscribe: () => void }
  }
}

/**
 * Runs `@talismn/balances` over a dapp's polkadot-api clients, so the dapp and its balances share one socket per chain.
 *
 * `state_subscribeStorage` is the only subscription balances uses. It is served by querying the keys at each new
 * best block and reporting the values that changed, like the node does. One query runs at a time, for the latest
 * best block. A failed query is retried at the next block, because balances treats a subscription error as final.
 * A subscription that gets no answer for a minute reports a `StaleRpcError`, as `ChainConnectorDot` does after a
 * disconnection.
 */
export class ChainConnectorDotPapi implements IChainConnectorDot {
  #getClient: (networkId: DotNetworkId) => PapiClient | undefined

  constructor(getClient: (networkId: DotNetworkId) => PapiClient | undefined) {
    this.#getClient = getClient
  }

  async send<T = unknown>(networkId: DotNetworkId, method: string, params: unknown[]): Promise<T> {
    return requestWithTimeout<T>(this.getClient(networkId), method, params)
  }

  async subscribe(
    networkId: DotNetworkId,
    subscribeMethod: string,
    _responseMethod: string,
    params: unknown[],
    callback: SubscriptionCallback,
    timeout: number | false = 30_000
  ): Promise<(unsubscribeMethod: string) => void> {
    const client = this.getClient(networkId)
    if (subscribeMethod !== "state_subscribeStorage")
      throw new Error(`ChainConnectorDotPapi does not support ${subscribeMethod}`)

    const [keys] = params as [HexString[]]
    const values = new Map<HexString, HexString | null>()
    let nextBlockHash: string | undefined
    let querying = false
    let delivered = false
    let active = true
    let staleTimer: ReturnType<typeof setTimeout> | undefined

    const reportStaleAfter = (ms: number) => {
      clearTimeout(staleTimer)
      staleTimer = setTimeout(() => {
        if (active) callback(new StaleRpcError(networkId), null)
      }, ms)
    }

    const queryNextBlock = async () => {
      if (querying || !nextBlockHash) return
      const blockHash = nextBlockHash
      nextBlockHash = undefined
      querying = true

      try {
        const [result] = await requestWithTimeout<StorageChanges[]>(
          client,
          "state_queryStorageAt",
          [keys, blockHash]
        )
        if (!result) throw new Error(`Empty state_queryStorageAt response on ${networkId}`)
        if (!active) return
        reportStaleAfter(STALE_AFTER)

        const changes = result.changes.filter(([key, value]) => values.get(key) !== value)
        for (const [key, value] of changes) values.set(key, value)
        if (changes.length || !delivered) {
          delivered = true
          callback(null, { block: result.block, changes })
        }
      } catch (error) {
        if (active)
          log.warn(`state_queryStorageAt failed on ${networkId}, retrying at the next block`, error)
      } finally {
        querying = false
        if (active) queryNextBlock()
      }
    }

    reportStaleAfter(timeout || STALE_AFTER)

    const subscription = client.bestBlocks$.subscribe({
      next: ([best]) => {
        nextBlockHash = best?.hash
        queryNextBlock()
      },
      error: (error) => {
        if (!active) return
        clearTimeout(staleTimer)
        callback(error as Error, null)
      },
    })

    return () => {
      active = false
      clearTimeout(staleTimer)
      subscription.unsubscribe()
    }
  }

  async reset() {}

  private getClient(networkId: DotNetworkId): PapiClient {
    const client = this.#getClient(networkId)
    if (!client) throw new Error(`No polkadot-api client for network ${networkId}`)
    return client
  }
}

const requestWithTimeout = <T>(
  client: PapiClient,
  method: string,
  params: unknown[]
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Timeout")), RESPONSE_TIMEOUT)
  })
  return Promise.race([client._request<T>(method, params), timeout]).finally(() =>
    clearTimeout(timer)
  )
}
