import type { ProviderInterfaceCallback } from "@polkadot/rpc-provider/types"
import { ChainId, ChaindataChainProvider } from "@talismn/chaindata-provider"
import { TalismanConnectionMetaDatabase } from "@talismn/connection-meta"
import { Deferred, sleep } from "@talismn/util"

import log from "./log"
import { Websocket } from "./Websocket"

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

/**
 * ChainConnector provides an interface similar to WsProvider, but with three points of difference:
 *
 * 1. ChainConnector methods all accept a `chainId` instead of an array of RPCs. RPCs are then fetched internally from chaindata.
 * 2. ChainConnector creates only one `WsProvider` per chain and ensures that all downstream requests to a chain share the one socket connection.
 * 3. Subscriptions return a callable `unsubscribe` method instead of an id.
 */
export class ChainConnector {
  #chaindataChainProvider: ChaindataChainProvider
  #connectionMetaDb?: TalismanConnectionMetaDatabase

  #socketConnections: Record<ChainId, Websocket> = {}
  #socketKeepAliveIntervals: Record<ChainId, ReturnType<typeof setInterval>> = {}
  #socketUsers: Record<ChainId, SocketUserId[]> = {}

  constructor(
    chaindataChainProvider: ChaindataChainProvider,
    connectionMetaDb?: TalismanConnectionMetaDatabase
  ) {
    this.#chaindataChainProvider = chaindataChainProvider
    this.#connectionMetaDb = connectionMetaDb

    if (this.#connectionMetaDb) {
      this.#chaindataChainProvider.chains().then((chains) => {
        const chainIds = Object.keys(chains)

        // tidy up connectionMeta for chains which no longer exist
        this.#connectionMetaDb?.chainPriorityRpc.where("id").noneOf(chainIds).delete()
        this.#connectionMetaDb?.chainBackoffInterval.where("id").noneOf(chainIds).delete()
      })
    }
  }

  async send<T = any>(
    chainId: ChainId,
    method: string,
    params: unknown[],
    isCacheable?: boolean | undefined
  ): Promise<T> {
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
      throw error
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
    unsubscribeMethod: string,
    responseMethod: string,
    params: unknown[],
    callback: ProviderInterfaceCallback,
    timeout: number | false = 30_000 // 30 seconds in milliseconds
  ): Promise<() => void> {
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
    const unsubscribe = () => unsubDeferred.reject(new Error(`Caller unsubscribed from ${chainId}`))
    // we queue up our work to clean up our subscription when this promise rejects
    const callerUnsubscribed = unsubDeferred.promise

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

        if (timeout) await Promise.race([this.waitForWs(ws, timeout), callerUnsubscribed])
        else await Promise.race([ws.isReady, callerUnsubscribed])
      } catch (error) {
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
      try {
        await Promise.race([
          ws.subscribe(responseMethod, subscribeMethod, params, callback).then((id) => {
            if (disconnected) ws.unsubscribe(responseMethod, unsubscribeMethod, id)
            else subscriptionId = id
          }),
          callerUnsubscribed,
        ])
      } catch (error) {
        unsubRpcStatus && unsubRpcStatus()
        disconnected = true
        subscriptionId !== null &&
          (await ws.unsubscribe(responseMethod, unsubscribeMethod, subscriptionId))
        await this.disconnectChainSocket(chainId, socketUserId)
        return
      }

      // unsubscribe from ws subscription when the caller has unsubscribed
      callerUnsubscribed
        .catch(async () => {
          unsubRpcStatus && unsubRpcStatus()
          subscriptionId !== null &&
            (await ws.unsubscribe(responseMethod, unsubscribeMethod, subscriptionId))
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
    const chain = await this.#chaindataChainProvider.getChain(chainId)
    if (!chain) throw new Error(`Chain ${chainId} not found in store`)
    const socketUserId = this.addSocketUser(chainId)

    // sort healthy rpcs before unhealthy rpcs
    const healthyRpcs = (chain.rpcs || [])
      .filter(({ isHealthy }) => isHealthy)
      .map(({ url }) => url)
    const unhealthyRpcs = (chain.rpcs || [])
      .filter(({ isHealthy }) => !isHealthy)
      .map(({ url }) => url)
    const rpcs = [...healthyRpcs, ...unhealthyRpcs]

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
}
