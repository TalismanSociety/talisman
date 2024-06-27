import type { ProviderInterface, ProviderInterfaceCallback } from "@polkadot/rpc-provider/types"
import { ChainId, IChaindataChainProvider } from "@talismn/chaindata-provider"
import { TalismanConnectionMetaDatabase } from "@talismn/connection-meta"
import { Deferred, sleep } from "@talismn/util"

import log from "./log"
import { Websocket } from "./Websocket"

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
export class WebsocketAllocationExhaustedError extends Error {
  type: "WEBSOCKET_ALLOCATION_EXHAUSTED_ERROR"
  chainId: string

  constructor(chainId: string, options?: ErrorOptions) {
    super(
      `No websockets are available from the browser pool to connect to chain ${chainId}`,
      options
    )

    this.type = "WEBSOCKET_ALLOCATION_EXHAUSTED_ERROR"
    this.chainId = chainId
  }
}
class CallerUnsubscribedError extends Error {
  type: "CALLER_UNSUBSCRIBED_ERROR"
  chainId: string
  unsubscribeMethod: string

  constructor(chainId: string, unsubscribeMethod: string, options?: ErrorOptions) {
    super(`Caller unsubscribed from ${chainId}`, options)

    this.type = "CALLER_UNSUBSCRIBED_ERROR"
    this.chainId = chainId
    this.unsubscribeMethod = unsubscribeMethod
  }
}

type SocketUserId = number

/**
 * ChainConnector provides an interface similar to WsProvider, but with three points of difference:
 *
 * 1. ChainConnector methods all accept a `chainId` instead of an array of RPCs. RPCs are then fetched internally from chaindata.
 * 2. ChainConnector creates only one `WsProvider` per chain and ensures that all downstream requests to a chain share the one socket connection.
 * 3. Subscriptions return a callable `unsubscribe` method instead of an id.
 *
 * Additionally, when run on the clientside of a dapp where `window.talismanSub` is available, instead of spinning up new websocket
 * connections this class will forward all requests through to the wallet backend - where another instance of this class will
 * handle the websocket connections.
 */
export class ChainConnector {
  #chaindataChainProvider: IChaindataChainProvider
  #connectionMetaDb?: TalismanConnectionMetaDatabase

  #socketConnections: Record<ChainId, Websocket> = {}
  #socketKeepAliveIntervals: Record<ChainId, ReturnType<typeof setInterval>> = {}
  #socketUsers: Record<ChainId, SocketUserId[]> = {}

  constructor(
    chaindataChainProvider: IChaindataChainProvider,
    connectionMetaDb?: TalismanConnectionMetaDatabase
  ) {
    this.#chaindataChainProvider = chaindataChainProvider
    this.#connectionMetaDb = connectionMetaDb

    if (this.#connectionMetaDb) {
      this.#chaindataChainProvider.chainIds().then((chainIds) => {
        // tidy up connectionMeta for chains which no longer exist
        this.#connectionMetaDb?.chainPriorityRpc.where("id").noneOf(chainIds).delete()
        this.#connectionMetaDb?.chainBackoffInterval.where("id").noneOf(chainIds).delete()
      })
    }
  }

  /**
   * Creates a facade over this ChainConnector which conforms to the PJS ProviderInterface
   * @example // Using a chainConnector as a Provider for an ApiPromise
   *   const provider = chainConnector.asProvider('polkadot')
   *   const api = new ApiPromise({ provider })
   */
  asProvider(chainId: ChainId): ProviderInterface {
    const unsubHandler = new Map<string, (unsubscribeMethod: string) => void>()

    const providerFacade: ProviderInterface = {
      hasSubscriptions: true,
      isClonable: false,
      isConnected: true,
      clone: () => providerFacade,
      connect: () => Promise.resolve(),
      disconnect: () => Promise.resolve(),
      on: () => () => {},

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      send: async <T = any>(method: string, params: unknown[], isCacheable?: boolean): Promise<T> =>
        await this.send(chainId, method, params, isCacheable),

      subscribe: async (
        type: string,
        method: string,
        params: unknown[],
        cb: ProviderInterfaceCallback
      ): Promise<string> => {
        const unsubscribe = await this.subscribe(chainId, method, type, params, cb)

        const subscriptionId = this.getExclusiveRandomId(
          [...unsubHandler.keys()].map(Number)
        ).toString()
        unsubHandler.set(subscriptionId, unsubscribe)

        return subscriptionId
      },

      unsubscribe: async (_type: string, unsubscribeMethod: string, subscriptionId: string) => {
        unsubHandler.get(subscriptionId)?.(unsubscribeMethod)
        unsubHandler.delete(subscriptionId)

        return true
      },
    }

    return providerFacade
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async send<T = any>(
    chainId: ChainId,
    method: string,
    params: unknown[],
    isCacheable?: boolean | undefined
  ): Promise<T> {
    const talismanSub = this.getTalismanSub()
    if (talismanSub !== undefined) {
      try {
        const chain = await this.#chaindataChainProvider.chainById(chainId)
        if (!chain) throw new Error(`Chain ${chainId} not found in store`)

        const { genesisHash } = chain
        if (typeof genesisHash !== "string")
          throw new Error(`Chain ${chainId} has no genesisHash in store`)

        return await talismanSub.send(genesisHash, method, params)
      } catch (error) {
        log.warn(
          `Failed to make wallet-proxied send request for chain ${chainId}. Falling back to plain websocket`,
          error
        )
      }
    }

    try {
      // eslint-disable-next-line no-var
      var [socketUserId, ws] = await this.connectChainSocket(chainId)
    } catch (error) {
      throw new StaleRpcError(chainId, { cause: error })
    }

    try {
      // wait for ws to be ready, but don't wait forever
      const timeout = 15_000 // 15 seconds in milliseconds
      await this.waitForWs(ws, timeout)
    } catch (error) {
      await this.disconnectChainSocket(chainId, socketUserId)
      throw new ChainConnectionError(chainId, { cause: error })
    }

    try {
      // eslint-disable-next-line no-var
      var response = await ws.send(method, params, isCacheable)
    } catch (error) {
      log.error(`Failed to send ${method} on chain ${chainId}`, error)
      await this.disconnectChainSocket(chainId, socketUserId)
      throw error
    }

    await this.disconnectChainSocket(chainId, socketUserId)

    return response
  }

  async subscribe(
    chainId: ChainId,
    subscribeMethod: string,
    responseMethod: string,
    params: unknown[],
    callback: ProviderInterfaceCallback,
    timeout: number | false = 30_000 // 30 seconds in milliseconds
  ): Promise<(unsubscribeMethod: string) => void> {
    const talismanSub = this.getTalismanSub()
    if (talismanSub !== undefined) {
      try {
        const chain = await this.#chaindataChainProvider.chainById(chainId)
        if (!chain) throw new Error(`Chain ${chainId} not found in store`)

        const { genesisHash } = chain
        if (typeof genesisHash !== "string")
          throw new Error(`Chain ${chainId} has no genesisHash in store`)

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

    try {
      // eslint-disable-next-line no-var
      var [socketUserId, ws] = await this.connectChainSocket(chainId)
    } catch (error) {
      throw new StaleRpcError(chainId, { cause: error })
    }

    // by using this `Deferred` promise
    // (a promise which can be resolved or rejected by code outside of the scope of the promise's constructor)
    // we can queue up our async cleanup on the promise and then immediately return an unsubscribe method to the caller
    const unsubDeferred = Deferred()
    // we return this to the caller so that they can let us know when they're no longer interested in this subscription
    const unsubscribe = (unsubscribeMethod: string) =>
      unsubDeferred.reject(new CallerUnsubscribedError(chainId, unsubscribeMethod))
    // we queue up our work to clean up our subscription when this promise rejects
    const callerUnsubscribed = unsubDeferred.promise

    // used to detect when there are no more websockets available from the browser websocket pool
    // in this scenario, we'll be waiting for ws.isReady until some existing sockets are closed
    //
    // while we're waiting, we'll send an error back to the caller so that they can show some useful
    // info to the user
    let noMoreSocketsTimeout: NodeJS.Timeout | undefined = undefined

    // create subscription asynchronously so that the caller can unsubscribe without waiting for
    // the subscription to be created (which can take some time if e.g. the connection can't be established)
    ;(async () => {
      // wait for ws to be ready, but don't wait forever
      // if timeout is number, cancel when timeout is reached (or caller unsubscribes)
      // if timeout is false, only cancel when the caller unsubscribes
      let unsubRpcStatus: (() => void) | null = null
      try {
        const unsubStale = ws.on(
          "stale-rpcs",
          ({ nextBackoffInterval }: { nextBackoffInterval?: number } = {}) => {
            callback(new StaleRpcError(chainId), null)

            if (this.#connectionMetaDb && nextBackoffInterval) {
              const id = chainId
              this.#connectionMetaDb.chainBackoffInterval.put(
                { id, interval: nextBackoffInterval },
                id
              )
            }
          }
        )
        const unsubConnected = ws.on("connected", () => {
          if (this.#connectionMetaDb) this.#connectionMetaDb.chainBackoffInterval.delete(chainId)
        })
        unsubRpcStatus = () => {
          unsubStale()
          unsubConnected()
        }

        noMoreSocketsTimeout = setTimeout(
          () => callback(new WebsocketAllocationExhaustedError(chainId), null),
          30_000 // 30 seconds in ms
        )

        if (timeout) await Promise.race([this.waitForWs(ws, timeout), callerUnsubscribed])
        else await Promise.race([ws.isReady, callerUnsubscribed])

        clearTimeout(noMoreSocketsTimeout)
      } catch (error) {
        clearTimeout(noMoreSocketsTimeout)

        unsubRpcStatus && unsubRpcStatus()
        await this.disconnectChainSocket(chainId, socketUserId)
        return
      }

      // create subscription on ws
      // handle the scenarios where the caller unsubscribes before the subscription has been created and:
      // - the subscriptionId is already set
      // - the subscriptionId is not set yet, but will be
      let subscriptionId: string | number | null = null
      let disconnected = false
      let unsubscribeMethod: string | undefined = undefined
      try {
        await Promise.race([
          ws.subscribe(responseMethod, subscribeMethod, params, callback).then((id) => {
            if (disconnected) {
              unsubscribeMethod && ws.unsubscribe(responseMethod, unsubscribeMethod, id)
            } else subscriptionId = id
          }),
          callerUnsubscribed,
        ])
      } catch (error) {
        if (error instanceof CallerUnsubscribedError) unsubscribeMethod = error.unsubscribeMethod

        unsubRpcStatus && unsubRpcStatus()
        disconnected = true

        if (subscriptionId !== null && unsubscribeMethod)
          await ws.unsubscribe(responseMethod, unsubscribeMethod, subscriptionId)

        await this.disconnectChainSocket(chainId, socketUserId)
        return
      }

      // unsubscribe from ws subscription when the caller has unsubscribed
      callerUnsubscribed
        .catch(async (error) => {
          let unsubscribeMethod = undefined
          if (error instanceof CallerUnsubscribedError) unsubscribeMethod = error.unsubscribeMethod

          unsubRpcStatus && unsubRpcStatus()

          if (subscriptionId !== null && unsubscribeMethod)
            await ws.unsubscribe(responseMethod, unsubscribeMethod, subscriptionId)

          await this.disconnectChainSocket(chainId, socketUserId)
        })
        .catch((error) => log.warn(error))
    })()

    return unsubscribe
  }

  /**
   * Wait for websocket to be ready, but don't wait forever
   */
  private async waitForWs(
    ws: Websocket,
    timeout: number | false = 30_000 // 30 seconds in milliseconds
  ): Promise<void> {
    const timer = timeout
      ? sleep(timeout).then(() => {
          throw new Error("RPC connect timeout reached")
        })
      : false

    await Promise.race([ws.isReady, timer].filter(Boolean))
  }

  /**
   * Connect to an RPC via chainId
   *
   * The caller must call disconnectChainSocket with the returned SocketUserId once they are finished with it
   */
  private async connectChainSocket(chainId: ChainId): Promise<[SocketUserId, Websocket]> {
    const chain = await this.#chaindataChainProvider.chainById(chainId)
    if (!chain) throw new Error(`Chain ${chainId} not found in store`)
    const socketUserId = this.addSocketUser(chainId)

    const rpcs = (chain.rpcs ?? []).map(({ url }) => url)

    // sort most recently connected rpc to the top of the list (if one exists)
    if (this.#connectionMetaDb) {
      const priorityRpc = await this.#connectionMetaDb.chainPriorityRpc.get(chainId)
      if (priorityRpc) {
        rpcs.sort((a, b) => (a === priorityRpc.url ? -1 : b === priorityRpc.url ? 1 : 0))
      }
    }

    // retrieve next rpc backoff interval from connection meta db (if one exists)
    let nextBackoffInterval: number | undefined = undefined
    if (this.#connectionMetaDb)
      nextBackoffInterval = (await this.#connectionMetaDb.chainBackoffInterval.get(chainId))
        ?.interval

    // NOTE: Make sure there are no calls to `await` between this check and the
    // next step where we assign a `new Websocket` to `this.#socketConnections[chainId]`
    //
    // If there is an `await` between these two steps then there will be a race condition introduced.
    // The result of this race condition will be the unnecessary creation of multiple instances of
    // `Websocket` per chain, rather than the intended behaviour where every call to send/subscribe
    // shares a single `Websocket` per chain.
    if (this.#socketConnections[chainId]) return [socketUserId, this.#socketConnections[chainId]]

    if (rpcs.length)
      this.#socketConnections[chainId] = new Websocket(
        rpcs,
        undefined,
        undefined,
        nextBackoffInterval
      )
    else {
      throw new Error(`No healthy RPCs available for chain ${chainId}`)
    }

    // on ws connected event, store current rpc as most recently connected rpc
    if (this.#connectionMetaDb) {
      this.#socketConnections[chainId].on("connected", () => {
        if (!this.#connectionMetaDb) return

        const id = chainId
        const url = this.#socketConnections[chainId]?.endpoint
        if (!url) return

        this.#connectionMetaDb.chainPriorityRpc.put({ id, url }, id)
      })
    }

    // set up healthcheck (keeps ws open when idle), don't wait for setup to complete
    ;(async () => {
      if (!this.#socketConnections[chainId])
        return log.warn(`ignoring ${chainId} rpc ws healthcheck initialization: ws is not defined`)
      await this.#socketConnections[chainId].isReady

      if (this.#socketKeepAliveIntervals[chainId])
        clearInterval(this.#socketKeepAliveIntervals[chainId])

      const intervalMs = 10_000 // 10,000ms = 10s
      this.#socketKeepAliveIntervals[chainId] = setInterval(() => {
        if (!this.#socketConnections[chainId])
          return log.warn(`skipping ${chainId} rpc ws healthcheck: ws is not defined`)

        if (!this.#socketConnections[chainId].isConnected)
          return log.warn(`skipping ${chainId} rpc ws healthcheck: ws is not connected`)

        this.#socketConnections[chainId]
          .send("system_health", [])
          .catch((error) => log.warn(`Failed keep-alive for socket ${chainId}`, error))
      }, intervalMs)
    })()

    return [socketUserId, this.#socketConnections[chainId]]
  }

  private async disconnectChainSocket(chainId: ChainId, socketUserId: SocketUserId): Promise<void> {
    this.removeSocketUser(chainId, socketUserId)

    if (this.#socketUsers[chainId].length > 0) return

    if (!this.#socketConnections[chainId])
      return log.warn(`Failed to disconnect socket: socket ${chainId} not found`)

    try {
      this.#socketConnections[chainId].disconnect()
    } catch (error) {
      log.warn(`Error occurred disconnecting socket ${chainId}`, error)
    }
    delete this.#socketConnections[chainId]
    clearInterval(this.#socketKeepAliveIntervals[chainId])
    delete this.#socketKeepAliveIntervals[chainId]
  }

  private addSocketUser(chainId: ChainId): SocketUserId {
    if (!Array.isArray(this.#socketUsers[chainId])) this.#socketUsers[chainId] = []
    const socketUserId: SocketUserId = this.getExclusiveRandomId(this.#socketUsers[chainId])
    this.#socketUsers[chainId].push(socketUserId)
    return socketUserId
  }
  private removeSocketUser(chainId: ChainId, socketUserId: SocketUserId) {
    const userIndex = this.#socketUsers[chainId].indexOf(socketUserId)
    if (userIndex === -1)
      throw new Error(
        `Can't remove user ${socketUserId} from socket ${chainId}: user not in list ${this.#socketUsers[
          chainId
        ].join(", ")}`
      )
    this.#socketUsers[chainId].splice(userIndex, 1)
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
    return Math.trunc(Math.random() * Math.pow(10, 8))
  }

  private getTalismanSub() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const talismanSub = typeof window !== "undefined" && (window as any).talismanSub

    /* eslint-disable @typescript-eslint/ban-types */
    const rpcByGenesisHashSend: Function | undefined = talismanSub?.rpcByGenesisHashSend
    const rpcByGenesisHashSubscribe: Function | undefined = talismanSub?.rpcByGenesisHashSubscribe
    const rpcByGenesisHashUnsubscribe: Function | undefined =
      talismanSub?.rpcByGenesisHashUnsubscribe

    if (typeof rpcByGenesisHashSend !== "function") return
    if (typeof rpcByGenesisHashSubscribe !== "function") return
    if (typeof rpcByGenesisHashUnsubscribe !== "function") return

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      send: <T = any>(genesisHash: string, method: string, params: unknown[]): Promise<T> =>
        rpcByGenesisHashSend(genesisHash, method, params),

      subscribe: (
        genesisHash: string,
        subscribeMethod: string,
        responseMethod: string,
        params: unknown[],
        callback: ProviderInterfaceCallback,
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
