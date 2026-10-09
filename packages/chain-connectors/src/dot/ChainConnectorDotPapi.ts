import type { DotNetworkId } from "@talismn/chaindata-provider"

import { StaleRpcError } from "./ChainConnectorDot"
import type { IChainConnectorDot, SubscriptionCallback } from "./IChainConnectorDot"

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
 * best block and reporting the values that changed, like the node does.
 */
export class ChainConnectorDotPapi implements IChainConnectorDot {
  #getClient: (networkId: DotNetworkId) => PapiClient | undefined

  constructor(getClient: (networkId: DotNetworkId) => PapiClient | undefined) {
    this.#getClient = getClient
  }

  async send<T = unknown>(networkId: DotNetworkId, method: string, params: unknown[]): Promise<T> {
    return this.getClient(networkId)._request<T>(method, params)
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
    let latestQuery = 0
    let latestResult = 0
    let delivered = false
    let active = true

    const staleTimer = timeout
      ? setTimeout(() => callback(new StaleRpcError(networkId), null), timeout)
      : undefined

    const report = (error: Error | null, result: StorageChanges | null) => {
      clearTimeout(staleTimer)
      delivered = true
      callback(error, result)
    }

    const queryAt = async (blockHash: string) => {
      const query = ++latestQuery
      try {
        const [result] = await client._request<StorageChanges[]>("state_queryStorageAt", [
          keys,
          blockHash,
        ])
        if (!active || query < latestResult) return
        latestResult = query
        if (!result) throw new Error(`Empty state_queryStorageAt response on ${networkId}`)

        const changes = result.changes.filter(([key, value]) => values.get(key) !== value)
        for (const [key, value] of changes) values.set(key, value)
        if (changes.length || !delivered) report(null, { block: result.block, changes })
      } catch (error) {
        if (active && query >= latestResult) report(error as Error, null)
      }
    }

    const subscription = client.bestBlocks$.subscribe({
      next: ([best]) => {
        if (best) queryAt(best.hash)
      },
      error: (error) => {
        if (active) report(error as Error, null)
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
