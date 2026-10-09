import { createClient, type SubstrateClient } from "@polkadot-api/substrate-client"
import {
  getWsProvider,
  type StatusChange,
  WsEvent,
  type WsJsonRpcProvider,
} from "@polkadot-api/ws-provider"
import type { DotNetworkId, IChaindataNetworkProvider } from "@talismn/chaindata-provider"

import log from "../log"
import type { IChainConnectorDot, SubscriptionCallback } from "./IChainConnectorDot"

// errors that require an rpc fallback
// https://docs.blastapi.io/blast-documentation/things-you-need-to-know/error-reference
const BAD_RPC_ERRORS: Record<string, string> = {
  "-32097": "Rate limit exceeded",
  "-32098": "Capacity exceeded",
}

const RESPONSE_TIMEOUT = 30_000 // max wait for an rpc response (including connection time)
const KEEP_ALIVE_INTERVAL = 20_000 // periodic system_health to keep idle sockets alive (ws-provider kills quiet sockets after its 40s heartbeat)

/** in-flight requests reject with DestroyedError when a connection is torn down - expected, not worth logging */
const isDestroyedError = (error: unknown): boolean =>
  error instanceof Error && error.name === "DestroyedError"
const STALE_NOTIFY_TIMEOUT = 30_000 // how long a chain can be disconnected before subscribers are notified

export class ChainConnectionError extends Error {
  type: "CHAIN_CONNECTION_ERROR"
  chainId: string

  constructor(chainId: string, options?: ErrorOptions) {
    super(`Unable to connect to chain ${chainId}`, options)

    this.type = "CHAIN_CONNECTION_ERROR"
    this.chainId = chainId
  }
}

export class StaleRpcError extends Error {
  type: "STALE_RPC_ERROR"
  chainId: string

  constructor(chainId: string, options?: ErrorOptions) {
    super(`RPCs are stale/unavailable for chain ${chainId}`, options)

    this.type = "STALE_RPC_ERROR"
    this.chainId = chainId
  }
}

type SocketUserId = number

type Subscription = {
  subscribeMethod: string
  params: unknown[]
  callback: SubscriptionCallback
  /** cancels the pending subscribe request, if any */
  cancelRequest: (() => void) | null
  /** stops routing notifications to the callback */
  stopFollow: (() => void) | null
  serverSubId: string | number | null
  unsubscribed: boolean
}

type Connection = {
  chainId: DotNetworkId
  provider: WsJsonRpcProvider
  client: SubstrateClient
  users: Set<SocketUserId>
  subscriptions: Set<Subscription>
  wasConnected: boolean
  keepAliveInterval: ReturnType<typeof setInterval> | null
  staleTimeout: ReturnType<typeof setTimeout> | null
}

/**
 * ChainConnector provides an interface similar to a websocket JSON-RPC provider, but with three points of difference:
 *
 * 1. ChainConnector methods all accept a `chainId` instead of an array of RPCs. RPCs are then fetched internally from chaindata.
 * 2. ChainConnector creates only one socket connection per chain (via polkadot-api's ws-provider, which handles
 *    endpoint rotation, reconnection and stale-socket detection) and ensures that all downstream requests to a chain
 *    share that connection.
 * 3. Subscriptions return a callable `unsubscribe` method instead of an id, and are automatically re-established
 *    when the provider reconnects (possibly to another endpoint).
 *
 * Additionally, when run on the clientside of a dapp where `window.talismanSub` is available, instead of spinning up new websocket
 * connections this class will forward all requests through to the wallet backend - where another instance of this class will
 * handle the websocket connections.
 */
export class ChainConnectorDot implements IChainConnectorDot {
  #chaindataChainProvider: IChaindataNetworkProvider

  #connections: Record<DotNetworkId, Connection> = {}
  #pendingConnections: Record<DotNetworkId, Promise<Connection>> = {}

  constructor(chaindataChainProvider: IChaindataNetworkProvider) {
    this.#chaindataChainProvider = chaindataChainProvider
  }

  // biome-ignore lint/suspicious/noExplicitAny: legacy
  async send<T = any>(
    chainId: DotNetworkId,
    method: string,
    params: unknown[],
    _isCacheable?: boolean | undefined,
    extraOptions?: {
      /**
       * Set to `true` if this query is speculative, i.e. if on some chains it's expected that it will raise a wasm unreachable error of the form:
       *
       *     4003: Client error: Execution failed: Execution aborted due to trap: wasm trap: wasm `unreachable` instruction executed
       *
       * By setting expectErrors to true, this method won't pollute the logs with errors we intend to have happen.
       * An example use case of this is when you plan to catch the wasm unreachable error on chains that don't support the query, and then fall back
       * to another query or perhaps an empty result.
       */
      expectErrors?: boolean
    }
  ): Promise<T> {
    const talismanSub = this.getTalismanSub()
    if (talismanSub !== undefined) {
      try {
        const genesisHash = await this.getGenesisHash(chainId)
        return await talismanSub.send(genesisHash, method, params)
      } catch (error) {
        log.warn(
          `Failed to make wallet-proxied send request for chain ${chainId}. Falling back to plain websocket`,
          error
        )
      }
    }

    let socketUserId: SocketUserId
    let connection: Connection
    try {
      ;[socketUserId, connection] = await this.acquireConnection(chainId)
    } catch (error) {
      throw new StaleRpcError(chainId, { cause: error })
    }

    try {
      return await this.request<T>(connection, method, params)
    } catch (err) {
      const error = err as (Error & { code?: number; data?: unknown }) | null

      if (error?.message === "TIMEOUT") {
        log.error(`ChainConnector timeout`, { chainId, error })
        connection.provider.switch()
        throw new Error("Timeout")
      }

      const badRpcError = BAD_RPC_ERRORS[error?.code?.toString() ?? ""]
      if (badRpcError) {
        log.error(`ChainConnector ${badRpcError}`, { error, chainId })
        connection.provider.switch()
        throw new Error(badRpcError)
      }

      if (!extraOptions?.expectErrors)
        log.error(
          `Failed to send ${method} on chain ${chainId}\nparams: ${JSON.stringify(params)}`,
          {
            error,
          }
        )

      throw error
    } finally {
      this.releaseConnection(chainId, socketUserId)
    }
  }

  async subscribe(
    chainId: DotNetworkId,
    subscribeMethod: string,
    responseMethod: string,
    params: unknown[],
    callback: SubscriptionCallback,
    timeout: number | false = 30_000 // 30 seconds in milliseconds
  ): Promise<(unsubscribeMethod: string) => void> {
    const talismanSub = this.getTalismanSub()
    if (talismanSub !== undefined) {
      try {
        const genesisHash = await this.getGenesisHash(chainId)

        const subscriptionId = await talismanSub.subscribe(
          genesisHash,
          subscribeMethod,
          responseMethod,
          params,
          callback,
          timeout
        )

        return (unsubscribeMethod: string) =>
          talismanSub.unsubscribe(subscriptionId, unsubscribeMethod)
      } catch (error) {
        log.warn(
          `Failed to create wallet-proxied subscription for chain ${chainId}. Falling back to plain websocket`,
          error
        )
      }
    }

    let socketUserId: SocketUserId
    let connection: Connection
    try {
      ;[socketUserId, connection] = await this.acquireConnection(chainId)
    } catch (error) {
      throw new StaleRpcError(chainId, { cause: error })
    }

    const subscription: Subscription = {
      subscribeMethod,
      params,
      callback,
      cancelRequest: null,
      stopFollow: null,
      serverSubId: null,
      unsubscribed: false,
    }
    connection.subscriptions.add(subscription)

    // if the chain can't be reached at all, let the caller know after a while (the provider keeps retrying)
    if (timeout && !connection.wasConnected) {
      const staleWarning = setTimeout(() => {
        if (!subscription.unsubscribed && !connection.wasConnected)
          callback(new StaleRpcError(chainId), null)
      }, timeout)
      const clear = () => clearTimeout(staleWarning)
      // piggyback on the follow setup to clear the warning once anything happens
      const originalCallback = subscription.callback
      subscription.callback = (error, result) => {
        clear()
        subscription.callback = originalCallback
        originalCallback(error, result)
      }
    }

    this.startSubscription(connection, subscription)

    return (unsubscribeMethod: string) => {
      if (subscription.unsubscribed) return
      subscription.unsubscribed = true

      subscription.cancelRequest?.()
      subscription.stopFollow?.()

      // the connection may have been replaced by a reset() since we subscribed
      const current = this.#connections[chainId]
      // if we are the last user the connection is about to be destroyed: skip the
      // unsubscribe call, server-side subscriptions die with the socket anyway
      const isLastUser = !!current && current.users.size === 1 && current.users.has(socketUserId)
      if (subscription.serverSubId !== null && current && !isLastUser)
        try {
          current.client.request(unsubscribeMethod, [subscription.serverSubId]).catch((error) => {
            if (!isDestroyedError(error)) log.warn(`Failed to unsubscribe from ${chainId}`, error)
          })
        } catch (error) {
          if (!isDestroyedError(error)) log.warn(`Failed to unsubscribe from ${chainId}`, error)
        }

      current?.subscriptions.delete(subscription)
      this.releaseConnection(chainId, socketUserId)
    }
  }

  /**
   * Kills and recreates the connection for a chain, if any.
   * Useful after changing a network's rpcs to make sure the new list is applied for further requests.
   * Active subscriptions are automatically re-established on the new connection.
   */
  async reset(chainId: DotNetworkId) {
    log.info("ChainConnector reset", chainId)
    const connection = this.#connections[chainId]
    if (!connection) return

    this.destroyConnection(connection)
    delete this.#connections[chainId]

    // recreate a connection for the active subscriptions, if any
    if (connection.subscriptions.size) {
      try {
        const fresh = await this.createConnection(chainId)
        fresh.users = connection.users
        fresh.subscriptions = connection.subscriptions
        this.#connections[chainId] = fresh
        for (const subscription of fresh.subscriptions) this.startSubscription(fresh, subscription)
      } catch (error) {
        log.warn(`Failed to recreate connection for ${chainId} after reset`, error)
        for (const subscription of connection.subscriptions)
          subscription.callback(new StaleRpcError(chainId, { cause: error }), null)
      }
    }
  }

  /** Sends a request over a connection, throwing `Error("TIMEOUT")` if no response arrives in time */
  private request<T>(
    connection: Connection,
    method: string,
    params: unknown[],
    timeoutMs = RESPONSE_TIMEOUT
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        cancel()
        reject(new Error("TIMEOUT"))
      }, timeoutMs)

      const cancel = connection.client._request<T, unknown>(method, params, {
        onSuccess: (result) => {
          clearTimeout(timer)
          resolve(result)
        },
        onError: (error) => {
          clearTimeout(timer)
          reject(error)
        },
      })
    })
  }

  /** Issues the subscribe request and routes notifications to the subscription callback */
  private startSubscription(connection: Connection, subscription: Subscription) {
    subscription.serverSubId = null
    subscription.stopFollow = null

    subscription.cancelRequest = connection.client._request<string | number, unknown>(
      subscription.subscribeMethod,
      subscription.params,
      {
        onSuccess: (serverSubId, follow) => {
          subscription.cancelRequest = null
          if (subscription.unsubscribed) return

          subscription.serverSubId = serverSubId
          // raw-client matches notifications by the raw (not stringified) subscription id, but types it as string
          subscription.stopFollow = follow(serverSubId as string, {
            next: (result) => subscription.callback(null, result),
            error: (error) => subscription.callback(error, null),
          })
        },
        onError: (error) => {
          subscription.cancelRequest = null
          if (!subscription.unsubscribed) subscription.callback(error, null)
        },
      }
    )
  }

  /**
   * Get (or create) the shared connection for a chain.
   *
   * The caller must call releaseConnection with the returned SocketUserId once they are finished with it.
   */
  private async acquireConnection(chainId: DotNetworkId): Promise<[SocketUserId, Connection]> {
    // a single creation promise per chain guarantees that concurrent callers share the same connection
    let connection = this.#connections[chainId]
    if (!connection) {
      if (!this.#pendingConnections[chainId]) {
        this.#pendingConnections[chainId] = this.createConnection(chainId)
          .then((created) => {
            this.#connections[chainId] = created
            return created
          })
          .finally(() => {
            delete this.#pendingConnections[chainId]
          })
      }
      connection = await this.#pendingConnections[chainId]
    }

    const socketUserId = this.getExclusiveRandomId([...connection.users])
    connection.users.add(socketUserId)

    return [socketUserId, connection]
  }

  private async createConnection(chainId: DotNetworkId): Promise<Connection> {
    const chain = await this.#chaindataChainProvider.getNetworkById(chainId, "polkadot")
    if (!chain) throw new Error(`Chain ${chainId} not found in store`)

    const rpcs = chain.rpcs.concat()
    if (!rpcs.length) throw new Error(`No healthy RPCs available for chain ${chainId}`)

    // will be assigned below - the provider config needs to reference the connection
    let connection: Connection = null as unknown as Connection

    const provider = getWsProvider(rpcs, {
      onStatusChanged: (status: StatusChange) => this.handleStatusChange(connection, status),
    })

    const client = createClient(provider)

    connection = {
      chainId,
      provider,
      client,
      users: new Set(),
      subscriptions: new Set(),
      wasConnected: false,
      keepAliveInterval: null,
      staleTimeout: null,
    }

    return connection
  }

  private handleStatusChange(connection: Connection, status: StatusChange) {
    // connection is still being constructed on the initial CONNECTING event
    if (!connection) return
    // ignore events from a connection that has been reset/destroyed
    if (this.#connections[connection.chainId] !== connection) return

    if (status.type === WsEvent.CONNECTED) {
      if (connection.staleTimeout) {
        clearTimeout(connection.staleTimeout)
        connection.staleTimeout = null
      }

      const isReconnect = connection.wasConnected
      connection.wasConnected = true

      // periodically send a request to keep the socket alive when there is no other traffic
      if (connection.keepAliveInterval) clearInterval(connection.keepAliveInterval)
      connection.keepAliveInterval = setInterval(() => {
        this.request(connection, "system_health", [], KEEP_ALIVE_INTERVAL).catch((error) => {
          if (!isDestroyedError(error))
            log.warn(`Failed keep-alive for socket ${connection.chainId}`, error)
        })
      }, KEEP_ALIVE_INTERVAL)

      // server-side subscriptions died with the previous socket : re-establish them
      // (skip author_* subscriptions : resubmitting an extrinsic is not safe)
      if (isReconnect)
        for (const subscription of connection.subscriptions) {
          if (subscription.unsubscribed) continue
          if (subscription.subscribeMethod.startsWith("author_")) continue
          subscription.stopFollow?.()
          subscription.cancelRequest?.()
          this.startSubscription(connection, subscription)
        }
    } else {
      if (connection.keepAliveInterval) {
        clearInterval(connection.keepAliveInterval)
        connection.keepAliveInterval = null
      }

      // notify subscribers if the chain stays unreachable for too long
      if (!connection.staleTimeout && connection.subscriptions.size) {
        connection.staleTimeout = setTimeout(() => {
          connection.staleTimeout = null
          for (const subscription of connection.subscriptions)
            if (!subscription.unsubscribed)
              subscription.callback(new StaleRpcError(connection.chainId), null)
        }, STALE_NOTIFY_TIMEOUT)
      }
    }
  }

  private releaseConnection(chainId: DotNetworkId, socketUserId: SocketUserId): void {
    const connection = this.#connections[chainId]
    if (!connection) return

    connection.users.delete(socketUserId)
    if (connection.users.size > 0) return

    this.destroyConnection(connection)
    delete this.#connections[chainId]
  }

  private destroyConnection(connection: Connection): void {
    if (connection.keepAliveInterval) clearInterval(connection.keepAliveInterval)
    if (connection.staleTimeout) clearTimeout(connection.staleTimeout)
    connection.keepAliveInterval = null
    connection.staleTimeout = null

    // detach subscriptions before destroying the client so their callbacks don't receive a DestroyedError
    for (const subscription of connection.subscriptions) {
      subscription.stopFollow?.()
      subscription.cancelRequest?.()
      subscription.stopFollow = null
      subscription.cancelRequest = null
      subscription.serverSubId = null
    }

    try {
      connection.client.destroy()
    } catch (error) {
      log.warn(`Error occurred destroying connection ${connection.chainId}`, error)
    }
  }

  private async getGenesisHash(chainId: DotNetworkId): Promise<string> {
    const chain = await this.#chaindataChainProvider.getNetworkById(chainId, "polkadot")
    if (!chain) throw new Error(`Chain ${chainId} not found in store`)

    const { genesisHash } = chain
    if (typeof genesisHash !== "string")
      throw new Error(`Chain ${chainId} has no genesisHash in store`)

    return genesisHash
  }

  /** continues to generate a random number until it finds one which is not present in the exclude list */
  private getExclusiveRandomId(exclude: number[] = []): number {
    let id = this.getRandomId()
    while (exclude.includes(id)) {
      id = this.getRandomId()
    }
    return id
  }
  /** generates a random number */
  private getRandomId(): number {
    return Math.trunc(Math.random() * 10 ** 8)
  }

  private getTalismanSub() {
    // biome-ignore lint/suspicious/noExplicitAny: legacy
    const talismanSub = typeof window !== "undefined" && (window as any).talismanSub

    // biome-ignore lint/complexity/noBannedTypes: legacy
    const rpcByGenesisHashSend: Function | undefined = talismanSub?.rpcByGenesisHashSend
    // biome-ignore lint/complexity/noBannedTypes: legacy
    const rpcByGenesisHashSubscribe: Function | undefined = talismanSub?.rpcByGenesisHashSubscribe
    // biome-ignore lint/complexity/noBannedTypes: legacy
    const rpcByGenesisHashUnsubscribe: Function | undefined =
      talismanSub?.rpcByGenesisHashUnsubscribe

    if (typeof rpcByGenesisHashSend !== "function") return
    if (typeof rpcByGenesisHashSubscribe !== "function") return
    if (typeof rpcByGenesisHashUnsubscribe !== "function") return

    return {
      // biome-ignore lint/suspicious/noExplicitAny: legacy
      send: <T = any>(genesisHash: string, method: string, params: unknown[]): Promise<T> =>
        rpcByGenesisHashSend(genesisHash, method, params),

      subscribe: (
        genesisHash: string,
        subscribeMethod: string,
        responseMethod: string,
        params: unknown[],
        callback: SubscriptionCallback,
        timeout: number | false
      ): Promise<string> =>
        rpcByGenesisHashSubscribe(
          genesisHash,
          subscribeMethod,
          responseMethod,
          params,
          callback,
          timeout
        ),

      unsubscribe: (subscriptionId: string, unsubscribeMethod: string): Promise<void> =>
        rpcByGenesisHashUnsubscribe(subscriptionId, unsubscribeMethod),
    }
  }
}
