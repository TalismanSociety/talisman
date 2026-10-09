import type { DotNetworkId } from "@talismn/chaindata-provider"

import log from "../log"
import { StaleRpcError } from "./ChainConnectorDot"
import type { IChainConnectorDot, SubscriptionCallback } from "./IChainConnectorDot"

const RESPONSE_TIMEOUT = 30_000
const FAILURES_BEFORE_FIRST_RESULT = 3

type HexString = `0x${string}`
type StorageChanges = { block: HexString; changes: [HexString, HexString | null][] }

/** The parts of a polkadot-api `PolkadotClient` that the connector uses */
export type PapiClient = {
  /** `PolkadotClient` types it without `abortSignal`, but it is substrate-client's `request`, which honours it */
  _request: <Reply>(method: string, params: unknown[], abortSignal?: AbortSignal) => Promise<Reply>
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
 * best block. Once a subscription has reported, a failed query is retried at the next block, because balances
 * treats a subscription error as final and would stop updating that network.
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
    let bestBlockHash: string | undefined
    let queriedBlockHash: string | undefined
    let querying = false
    let delivered = false
    let failures = 0
    let active = true
    const staleTimer = timeout
      ? setTimeout(() => callback(new StaleRpcError(networkId), null), timeout)
      : undefined

    const stop = () => {
      active = false
      clearTimeout(staleTimer)
      subscription.unsubscribe()
    }

    const reportChanges = (result: StorageChanges) => {
      failures = 0
      const changes = result.changes.filter(([key, value]) => values.get(key) !== value)
      for (const [key, value] of changes) values.set(key, value)
      if (!changes.length) return

      delivered = true
      clearTimeout(staleTimer)
      callback(null, { block: result.block, changes })
    }

    const reportFailure = (error: Error) => {
      if (delivered || ++failures < FAILURES_BEFORE_FIRST_RESULT)
        return log.warn(
          `state_queryStorageAt failed on ${networkId}, retrying at the next block`,
          error
        )

      stop()
      callback(error, null)
    }

    const queryBestBlock = async () => {
      if (querying || !bestBlockHash || bestBlockHash === queriedBlockHash) return
      const blockHash = bestBlockHash
      queriedBlockHash = blockHash
      querying = true

      const outcome = await requestWithTimeout<StorageChanges[]>(client, "state_queryStorageAt", [
        keys,
        blockHash,
      ]).then(
        ([result]) => result ?? new Error(`Empty state_queryStorageAt response on ${networkId}`),
        (error: Error) => error
      )
      querying = false
      if (!active) return

      queryBestBlock()
      if (outcome instanceof Error) reportFailure(outcome)
      else reportChanges(outcome)
    }

    const subscription = client.bestBlocks$.subscribe({
      next: ([best]) => {
        bestBlockHash = best?.hash
        queryBestBlock()
      },
      error: (error) => {
        if (!active) return
        active = false
        clearTimeout(staleTimer)
        callback(error as Error, null)
      },
    })

    return stop
  }

  async reset() {}

  private getClient(networkId: DotNetworkId): PapiClient {
    const client = this.#getClient(networkId)
    if (!client) throw new Error(`No polkadot-api client for network ${networkId}`)
    return client
  }
}

const requestWithTimeout = <T>(client: PapiClient, method: string, params: unknown[]) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), RESPONSE_TIMEOUT)
  return client._request<T>(method, params, controller.signal).finally(() => clearTimeout(timer))
}
