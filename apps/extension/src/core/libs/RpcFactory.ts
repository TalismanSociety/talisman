import { DEBUG } from "@core/constants"
import { settingsStore } from "@core/domains/app/store.settings"
import { db } from "@core/libs/db"
import { SmoldotProvider } from "@core/libs/SmoldotProvider"
import { ChainId } from "@core/types"
import { WsProvider } from "@polkadot/api"
import { ProviderInterfaceCallback } from "@polkadot/rpc-provider/types"
import * as Sentry from "@sentry/browser"
import { ReplaySubject, firstValueFrom } from "rxjs"

type SocketUserId = number
type Provider = WsProvider | SmoldotProvider

/**
 * RpcFactory provides an interface similar to WsProvider, but with three points of difference:
 *
 * 1. RpcFactory methods all accept a `chainId` instead of an array of RPCs. RPCs are then fetched internally from chaindata.
 * 2. RpcFactory creates only one `WsProvider` per chain and ensures that all downstream requests to a chain share the one socket connection.
 * 3. Subscriptions return a callable `unsubscribe` method instead of an id.
 */
class RpcFactory {
  #socketConnections: Record<ChainId, { provider?: Provider; isReady: Promise<void> }> = {}
  #socketKeepAliveIntervals: Record<ChainId, ReturnType<typeof setInterval>> = {}
  #socketUsers: Record<ChainId, SocketUserId[]> = {}

  async send<T = any>(
    chainId: ChainId,
    method: string,
    params: unknown[],
    isCacheable?: boolean | undefined
  ): Promise<T> {
    const [socketUserId, ws] = await this.connectChainSocket(chainId)

    try {
      var response = await ws.send(method, params, isCacheable)
    } catch (error) {
      Sentry.captureException(new Error("Failed to send"), {
        extra: { method, chainId },
      })
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
    callback: ProviderInterfaceCallback
  ): Promise<() => Promise<void>> {
    // TODO: Fix this function so that caller doesn't have to wait for
    //      socket to connect before they can call unsubscribe()

    const [socketUserId, ws] = await this.connectChainSocket(chainId)

    try {
      var subscriptionId = await ws.subscribe(responseMethod, subscribeMethod, params, callback)
    } catch (error) {
      await this.disconnectChainSocket(chainId, socketUserId)
      throw error
    }

    const unsubscribe = async () => {
      await ws.unsubscribe(responseMethod, unsubscribeMethod, subscriptionId)
      await this.disconnectChainSocket(chainId, socketUserId)
    }

    return unsubscribe
  }

  /**
   * Connect to an RPC via chainId
   *
   * The caller must call disconnectChainSocket with the returned SocketUserId once they are finished with it
   */
  private async connectChainSocket(chainId: ChainId): Promise<[SocketUserId, Provider]> {
    const chain = await db.chains.get(chainId)
    if (!chain) throw new Error(`Chain ${chainId} not found in store`)
    const socketUserId = this.addSocketUser(chainId)

    // cache latest value of useSmoldot
    const useSmoldot = new ReplaySubject<boolean>(1)
    settingsStore.observable.subscribe((settings) => useSmoldot.next(settings.useSmoldot))

    if (this.#socketConnections[chainId]) {
      await this.#socketConnections[chainId].isReady
      return [socketUserId, this.#socketConnections[chainId].provider!]
    }

    const chainspecUrls: Record<ChainId, string> = {
      polkadot: "/chainspecs/polkadot.json",
      // kusama: "/chainspecs/ksmcc3.json",
      // westend: "/chainspecs/westend2.json",
      // rococo: "/chainspecs/rococo_v2_2.json",
    }

    const connectRpc = async (): Promise<[number, Provider]> => {
      const autoConnectMs = 1000
      try {
        const healthyRpcs = (chain.rpcs || [])
          .filter(({ isHealthy }) => isHealthy)
          .map(({ url }) => url)
        if (healthyRpcs.length > 0) {
          const provider = new WsProvider(healthyRpcs, autoConnectMs)
          this.#socketConnections[chainId] = { provider, isReady: provider.isReady.then(() => {}) }
        } else throw new Error(`No healthy RPCs available for chain ${chainId}`)
      } catch (error) {
        DEBUG && console.error(error) // eslint-disable-line no-console
        throw error
      }

      // set up healthcheck (keeps ws open when idle), don't wait for setup to complete
      ;(async () => {
        if (!this.#socketConnections[chainId])
          // eslint-disable-next-line no-console
          return console.warn("ignoring rpc ws healthcheck initialization: ws is not defined")
        await this.#socketConnections[chainId].isReady

        if (this.#socketKeepAliveIntervals[chainId])
          clearInterval(this.#socketKeepAliveIntervals[chainId])

        const intervalMs = 10_000 // 10,000ms = 10s
        this.#socketKeepAliveIntervals[chainId] = setInterval(() => {
          if (!this.#socketConnections[chainId])
            // eslint-disable-next-line no-console
            return console.warn("skipping rpc ws healthcheck: ws is not defined")

          if (!this.#socketConnections[chainId].provider!.isConnected)
            // eslint-disable-next-line no-console
            return console.warn("skipping rpc ws healthcheck: ws is not connected")

          this.#socketConnections[chainId]
            .provider!.send("system_health", [])
            // eslint-disable-next-line no-console
            .catch((error) => console.warn(`Failed keep-alive for socket ${chainId}`, error))
        }, intervalMs)
      })()

      await this.#socketConnections[chainId].isReady
      return [socketUserId, this.#socketConnections[chainId].provider!]
    }

    const connectSmoldot = async (chainId: ChainId): Promise<[number, Provider]> => {
      const chainspecUrl = chainspecUrls[chainId]
      if (!chainspecUrl) throw new Error(`No chainspec found for chain ${chainId}`)

      let ready: () => void
      let isReady = new Promise<void>((resolve) => (ready = resolve))
      this.#socketConnections[chainId] = { isReady }

      const chainspec = await (await fetch(chainspecUrl)).text()
      const databaseContent = (await db.smoldotDbContent.get(chainId))?.databaseContent

      const provider = new SmoldotProvider(chainspec, databaseContent)

      provider.on("connected", ready!)
      provider.on("error", (error) =>
        Sentry.captureException(error, { tags: { module: "lightclients" } })
      )
      this.#socketConnections[chainId] = { provider, isReady }

      let startTime = Date.now()
      try {
        await this.#socketConnections[chainId].provider!.connect()
      } catch (error) {
        DEBUG && console.error(error) // eslint-disable-line no-console
        Sentry.captureException(error, { tags: { module: "lightclients" } })
        throw error
      }

      await this.#socketConnections[chainId].isReady

      let startupDuration = (Date.now() - startTime) / 1000
      // eslint-disable-next-line no-console
      console.log(
        `Lightclient startup for chain ${chainId} took ${Math.floor(
          startupDuration / 60
        )} minutes and ${(startupDuration % 60).toFixed(2)} seconds`
      )

      const intervalId = setInterval(() => {
        provider.databaseContent().then((databaseContent) => {
          // eslint-disable-next-line no-console
          console.log("Storing smoldotDbContent", chainId)
          db.smoldotDbContent.put({ chainId, databaseContent })
        })
      }, 10_000)

      provider.on("disconnected", () => {
        clearInterval(intervalId)
      })

      return [socketUserId, this.#socketConnections[chainId].provider!]
    }

    const yeet = await firstValueFrom(useSmoldot)

    if (chainspecUrls[chain.id] !== undefined && (await firstValueFrom(useSmoldot))) {
      return await connectSmoldot(chain.id)
    }

    return await connectRpc()
  }

  private async disconnectChainSocket(chainId: ChainId, socketUserId: SocketUserId): Promise<void> {
    this.removeSocketUser(chainId, socketUserId)

    if (this.#socketUsers[chainId].length > 0) return

    if (!this.#socketConnections[chainId]) {
      DEBUG && console.warn(`Failed to disconnect socket: socket ${chainId} not found`) // eslint-disable-line no-console
      return
    }

    try {
      this.#socketConnections[chainId].provider!.disconnect()
    } catch (error) {
      DEBUG && console.warn(`Error occurred disconnecting socket ${chainId}`, error) // eslint-disable-line no-console
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

export default new RpcFactory()
