import EventEmitter from "eventemitter3"

import log from "../log"
import { ExponentialBackoff } from "./helpers"
import type { ProviderInterface, ProviderInterfaceCallback, ProviderInterfaceEmitCb } from "./types"

type ProviderInterfaceEmitted = "connected" | "disconnected" | "error" | "stale-rpcs"

interface JsonRpcResponse {
  id: number
  jsonrpc: "2.0"
  result?: unknown
  error?: { code: number; data?: number | string; message: string }
  method?: string
  params: {
    error?: { code: number; data?: number | string; message: string }
    result: unknown
    subscription: number | string
  }
}

class RpcError extends Error {
  code: number
  data?: number | string
  constructor(message: string, code: number, data?: number | string) {
    super(message)
    this.name = "RpcError"
    this.code = code
    this.data = data
  }
}

class RpcCoder {
  #id = 0

  encodeJson(method: string, params: unknown[]): [number, string] {
    const id = ++this.#id
    return [id, JSON.stringify({ id, jsonrpc: "2.0", method, params })]
  }

  decodeResponse(response: JsonRpcResponse): unknown {
    if (!response || response.jsonrpc !== "2.0")
      throw new Error("Invalid jsonrpc field in decoded object")

    const isSubscription = response.params !== undefined && response.method !== undefined

    if (response.error) {
      const { code, data, message } = response.error
      const formatted =
        data !== undefined ? `: ${typeof data === "string" ? data : JSON.stringify(data)}` : ""
      throw new RpcError(
        `${code}: ${message}${formatted.length <= 256 ? formatted : `${formatted.substring(0, 255)}…`}`,
        code,
        data
      )
    }

    if (isSubscription) {
      if (response.params.error) {
        const { code, data, message } = response.params.error
        throw new RpcError(`${code}: ${message}`, code, data)
      }
      return response.params.result
    }

    if (response.result === undefined) throw new Error("No result found in jsonrpc response")

    return response.result
  }
}

const WS_ERROR_CODES: Record<number, string> = {
  1000: "Normal Closure",
  1001: "Going Away",
  1002: "Protocol Error",
  1003: "Unsupported Data",
  1005: "No Status Received",
  1006: "Abnormal Closure",
  1007: "Invalid frame payload data",
  1008: "Policy Violation",
  1009: "Message too big",
  1010: "Missing Extension",
  1011: "Internal Error",
  1012: "Service Restart",
  1013: "Try Again Later",
  1014: "Bad Gateway",
  1015: "TLS Handshake",
}

const getWSErrorString = (code: number): string => WS_ERROR_CODES[code] ?? "(Unknown)"

interface SubscriptionHandler {
  callback: ProviderInterfaceCallback
  type: string
}

interface WsStateAwaiting {
  callback: ProviderInterfaceCallback
  method: string
  params: unknown[]
  start: number
  subscription?: SubscriptionHandler
}

interface WsStateSubscription extends SubscriptionHandler {
  method: string
  params: unknown[]
}

const ALIASES: { [index: string]: string } = {
  chain_finalisedHead: "chain_finalizedHead",
  chain_subscribeFinalisedHeads: "chain_subscribeFinalizedHeads",
  chain_unsubscribeFinalisedHeads: "chain_unsubscribeFinalizedHeads",
}

const DEFAULT_TIMEOUT_MS = 60 * 1000
const TIMEOUT_INTERVAL = 5_000

function eraseRecord<T>(record: Record<string, T>, cb?: (item: T) => void): void {
  Object.keys(record).forEach((key): void => {
    if (cb) {
      cb(record[key])
    }

    delete record[key]
  })
}

/**
 * # @talismn/chain-connector/Websocket
 *
 * @name Websocket
 *
 * @description The WebSocket Provider allows sending requests using WebSocket to a WebSocket RPC server TCP port. Unlike the [[HttpProvider]], it does support subscriptions and allows listening to events such as new blocks or balance changes.
 *
 * @example
 * <BR>
 *
 * ```javascript
 * import { Websocket } from '@talismn/chain-connector';
 *
 * const provider = new Websocket('ws://127.0.0.1:9944');
 * ```
 *
 * @see [[HttpProvider]]
 */
export class Websocket implements ProviderInterface {
  readonly #coder: RpcCoder
  readonly #endpoints: string[]
  readonly #headers: Record<string, string>
  readonly #eventemitter: EventEmitter
  readonly #handlers: Record<string, WsStateAwaiting> = {}
  readonly #isReadyPromise: Promise<Websocket>
  readonly #waitingForId: Record<string, JsonRpcResponse> = {}

  #autoConnectBackoff: ExponentialBackoff
  #endpointIndex: number
  #endpointsTriedSinceLastConnection = 0
  #isConnected = false
  #subscriptions: Record<string, WsStateSubscription> = {}
  #timeoutId?: ReturnType<typeof setInterval> | null = null
  #websocket: WebSocket | null
  #timeout: number

  /**
   * @param {string | string[]}  endpoint    The endpoint url. Usually `ws://ip:9944` or `wss://ip:9944`, may provide an array of endpoint strings.
   * @param {Record<string, string>} headers The headers provided to the underlying WebSocket
   * @param {number} [timeout] Custom timeout value used per request . Defaults to `DEFAULT_TIMEOUT_MS`
   */
  constructor(
    endpoint: string | string[],
    headers: Record<string, string> = {},
    timeout?: number,
    nextBackoffInterval?: number
  ) {
    const endpoints = Array.isArray(endpoint) ? endpoint : [endpoint]

    if (endpoints.length === 0) {
      throw new Error("Websocket requires at least one Endpoint")
    }

    endpoints.forEach((endpoint) => {
      if (!/^(wss|ws):\/\//.test(endpoint)) {
        throw new Error(`Endpoint should start with 'ws://', received '${endpoint}'`)
      }
    })

    this.#eventemitter = new EventEmitter()
    this.#autoConnectBackoff = new ExponentialBackoff()
    if (nextBackoffInterval) this.#autoConnectBackoff.resetTo(nextBackoffInterval)
    this.#coder = new RpcCoder()
    this.#endpointIndex = -1
    this.#endpoints = endpoints
    this.#headers = headers
    this.#websocket = null
    this.#timeout = timeout || DEFAULT_TIMEOUT_MS

    if (this.#autoConnectBackoff.isActive) {
      this.connectWithRetry().catch(() => {
        // does not throw
      })
    }

    this.#isReadyPromise = new Promise((resolve): void => {
      this.#eventemitter.once("connected", (): void => {
        resolve(this)
      })
    })
  }

  /**
   * @summary `true` when this provider supports subscriptions
   */
  public get hasSubscriptions(): boolean {
    return true
  }

  /**
   * @summary `true` when this provider supports clone()
   */
  public get isClonable(): boolean {
    return true
  }

  /**
   * @summary Whether the node is connected or not.
   * @return {boolean} true if connected
   */
  public get isConnected(): boolean {
    return this.#isConnected
  }

  /**
   * @description Promise that resolves the first time we are connected and loaded
   */
  public get isReady(): Promise<Websocket> {
    return this.#isReadyPromise
  }

  public get endpoint(): string {
    return this.#endpoints[this.#endpointIndex]
  }

  /**
   * @description Returns a clone of the object
   */
  public clone(): Websocket {
    return new Websocket(this.#endpoints)
  }

  protected selectEndpointIndex(endpoints: string[]): number {
    this.#endpointsTriedSinceLastConnection += 1
    return (this.#endpointIndex + 1) % endpoints.length
  }

  /**
   * @summary Manually connect
   * @description The [[Websocket]] connects automatically by default, however if you decided otherwise, you may
   * connect manually using this method.
   */
  public async connect(): Promise<void> {
    if (this.#websocket) {
      throw new Error("WebSocket is already connected")
    }

    try {
      this.#endpointIndex = this.selectEndpointIndex(this.#endpoints)

      // In browsers, WebSocket constructor only accepts (url, protocols?).
      // Node.js `ws` library accepts (url, protocols, options) for custom headers.
      // Detect by checking for `process.versions.node` (present in Node, absent in browsers).
      const hasNodeHeaders =
        Object.keys(this.#headers).length > 0 &&
        typeof process !== "undefined" &&
        !!process?.versions?.node
      this.#websocket = hasNodeHeaders
        ? // @ts-expect-error - Node.js ws library supports a third options argument
          new globalThis.WebSocket(this.endpoint, [], { headers: this.#headers })
        : new globalThis.WebSocket(this.endpoint)

      if (this.#websocket) {
        this.#websocket.onclose = this.#onSocketClose
        this.#websocket.onerror = this.#onSocketError
        this.#websocket.onmessage = this.#onSocketMessage
        this.#websocket.onopen = this.#onSocketOpen
      }

      // timeout any handlers that have not had a response
      this.#timeoutId = setInterval(() => this.#timeoutHandlers(), TIMEOUT_INTERVAL)
    } catch (error) {
      log.error(error)

      this.#emit("error", error)

      throw error
    }
  }

  /**
   * @description Connect, never throwing an error, but rather forcing a retry
   */
  public async connectWithRetry(): Promise<void> {
    if (!this.#autoConnectBackoff.isActive) return

    try {
      await this.connect()
    } catch {
      this.scheduleNextRetry()
    }
  }

  protected scheduleNextRetry() {
    if (!this.#autoConnectBackoff.isActive) return

    const haveTriedAllEndpoints =
      this.#endpointsTriedSinceLastConnection > 0 &&
      this.#endpointsTriedSinceLastConnection % this.#endpoints.length === 0

    setTimeout(
      (): void => {
        this.connectWithRetry().catch(() => {
          // does not throw
        })
      },
      haveTriedAllEndpoints ? this.#autoConnectBackoff.next : 0
    )

    // Increase backoff when we've tried all endpoints
    if (haveTriedAllEndpoints) this.#autoConnectBackoff.increase()

    // Fire a stale-rpcs event when we've tried all endpoints in the list
    // but haven't successfully connected to any of them
    if (haveTriedAllEndpoints)
      this.#emit("stale-rpcs", { nextBackoffInterval: this.#autoConnectBackoff.next })
  }

  /**
   * @description Manually disconnect from the connection, clearing auto-connect logic
   */
  public async disconnect(): Promise<void> {
    // switch off autoConnect, we are in manual mode now
    this.#autoConnectBackoff.disable()

    try {
      if (this.#websocket) {
        // 1000 - Normal closure; the connection successfully completed
        this.#websocket.close(1000)
      }
    } catch (error) {
      log.error(error)

      this.#emit("error", error)

      throw error
    }
  }

  /**
   * @summary Listens on events after having subscribed using the [[subscribe]] function.
   * @param  {ProviderInterfaceEmitted} type Event
   * @param  {ProviderInterfaceEmitCb}  sub  Callback
   * @return unsubscribe function
   */
  public on(type: ProviderInterfaceEmitted, sub: ProviderInterfaceEmitCb): () => void {
    this.#eventemitter.on(type, sub)

    return (): void => {
      this.#eventemitter.removeListener(type, sub)
    }
  }

  /**
   * @summary Send JSON data using WebSockets to configured HTTP Endpoint or queue.
   * @param method The RPC methods to execute
   * @param params Encoded parameters as applicable for the method
   * @param subscription Subscription details (internally used)
   */
  // biome-ignore lint/suspicious/noExplicitAny: legacy
  public send<T = any>(
    method: string,
    params: unknown[],
    /** @deprecated \@talismn/chain-connector doesn't implement a cache */
    _isCacheable?: boolean,
    subscription?: SubscriptionHandler
  ): Promise<T> {
    const [id, body] = this.#coder.encodeJson(method, params)
    const resultPromise: Promise<T> = this.#send(id, body, method, params, subscription)

    return resultPromise
  }

  async #send<T>(
    id: number,
    body: string,
    method: string,
    params: unknown[],
    subscription?: SubscriptionHandler
  ): Promise<T> {
    return new Promise<T>((resolve, reject): void => {
      try {
        if (!this.isConnected || this.#websocket === null) {
          throw new Error("WebSocket is not connected")
        }

        const callback = (error?: Error | null, result?: T): void => {
          error ? reject(error) : resolve(result as T)
        }

        // log.debug(() => ["calling", method, body])

        this.#handlers[id] = {
          callback,
          method,
          params,
          start: Date.now(),
          subscription,
        }
        this.#websocket.send(body)
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * @name subscribe
   * @summary Allows subscribing to a specific event.
   *
   * @example
   * <BR>
   *
   * ```javascript
   * const provider = new Websocket('ws://127.0.0.1:9944');
   * const rpc = new Rpc(provider);
   *
   * rpc.state.subscribeStorage([[storage.system.account, <Address>]], (_, values) => {
   *   console.log(values)
   * }).then((subscriptionId) => {
   *   console.log('balance changes subscription id: ', subscriptionId)
   * })
   * ```
   */
  public subscribe(
    type: string,
    method: string,
    params: unknown[],
    callback: ProviderInterfaceCallback
  ): Promise<number | string> {
    return this.send<number | string>(method, params, false, { callback, type })
  }

  /**
   * @summary Allows unsubscribing to subscriptions made with [[subscribe]].
   */
  public async unsubscribe(type: string, method: string, id: number | string): Promise<boolean> {
    const subscription = `${type}::${id}`

    // FIXME This now could happen with re-subscriptions. The issue is that with a re-sub
    // the assigned id now does not match what the API user originally received. It has
    // a slight complication in solving - since we cannot rely on the send id, but rather
    // need to find the actual subscription id to map it
    if (this.#subscriptions[subscription] === undefined) {
      // log.debug(() => `Unable to find active subscription=${subscription}`)

      return false
    }

    delete this.#subscriptions[subscription]

    try {
      return this.isConnected && this.#websocket !== null ? this.send<boolean>(method, [id]) : true
    } catch {
      return false
    }
  }

  #emit = (type: ProviderInterfaceEmitted, ...args: unknown[]): void => {
    this.#eventemitter.emit(type, ...args)
  }

  #onSocketClose = (event: CloseEvent): void => {
    const error = new Error(
      `disconnected from ${this.endpoint}: ${event.code}:: ${
        event.reason || getWSErrorString(event.code)
      }`
    )

    if (this.#autoConnectBackoff.isActive) {
      // 1000 is a normal closure and should not be logged as an error
      if (event.code !== 1000) log.error(error.message)
    }

    this.#isConnected = false

    if (this.#websocket) {
      this.#websocket.onclose = null
      this.#websocket.onerror = null
      this.#websocket.onmessage = null
      this.#websocket.onopen = null
      this.#websocket = null
    }

    if (this.#timeoutId) {
      clearInterval(this.#timeoutId)
      this.#timeoutId = null
    }

    // reject all hanging requests
    eraseRecord(this.#handlers, (h) => {
      try {
        h.callback(error, undefined)
      } catch (err) {
        // does not throw
        log.error(err)
      }
    })
    eraseRecord(this.#waitingForId)

    this.#emit("disconnected")

    this.scheduleNextRetry()
  }

  #onSocketError = (error: Event): void => {
    // log.debug(() => ["socket error", error])
    this.#emit("error", error)
  }

  #onSocketMessage = (message: MessageEvent<string>): void => {
    // log.debug(() => ["received", message.data])
    try {
      const response = JSON.parse(message.data) as JsonRpcResponse

      // biome-ignore lint/correctness/noVoidTypeReturn: legacy
      return response.method === undefined
        ? this.#onSocketMessageResult(response)
        : this.#onSocketMessageSubscribe(response)
    } catch (e) {
      this.#emit("error", new Error("Invalid websocket message received", { cause: e }))
    }
  }

  #onSocketMessageResult = (response: JsonRpcResponse): void => {
    const handler = this.#handlers[response.id]

    if (!handler) {
      // log.debug(() => `Unable to find handler for id=${response.id}`)

      return
    }

    try {
      const { method, params, subscription } = handler
      const result = this.#coder.decodeResponse(response) as string

      // first send the result - in case of subs, we may have an update
      // immediately if we have some queued results already
      handler.callback(null, result)

      if (subscription) {
        const subId = `${subscription.type}::${result}`

        this.#subscriptions[subId] = { ...subscription, method, params }

        // if we have a result waiting for this subscription already
        if (this.#waitingForId[subId]) {
          this.#onSocketMessageSubscribe(this.#waitingForId[subId])
        }
      }
    } catch (error) {
      handler.callback(error as Error, undefined)
    }

    delete this.#handlers[response.id]
  }

  #onSocketMessageSubscribe = (response: JsonRpcResponse): void => {
    const method = ALIASES[response.method as string] || response.method || "invalid"
    const subId = `${method}::${response.params.subscription}`
    const handler = this.#subscriptions[subId]

    if (!handler) {
      // store the JSON, we could have out-of-order subid coming in
      this.#waitingForId[subId] = response

      // log.debug(() => `Unable to find handler for subscription=${subId}`)

      return
    }

    // housekeeping
    delete this.#waitingForId[subId]

    try {
      const result = this.#coder.decodeResponse(response)

      handler.callback(null, result)
    } catch (error) {
      handler.callback(error as Error, undefined)
    }
  }

  #onSocketOpen = (): boolean => {
    if (this.#websocket === null) {
      throw new Error("WebSocket cannot be null in onOpen")
    }

    // log.debug(() => ["connected to", this.endpoint])

    this.#isConnected = true
    this.#endpointsTriedSinceLastConnection = 0
    this.#autoConnectBackoff.reset()

    this.#resubscribe()

    this.#emit("connected")

    return true
  }

  #resubscribe = (): void => {
    const subscriptions = this.#subscriptions

    this.#subscriptions = {}

    Promise.all(
      Object.keys(subscriptions).map(async (id): Promise<void> => {
        const { callback, method, params, type } = subscriptions[id]

        // only re-create subscriptions which are not in author (only area where
        // transactions are created, i.e. submissions such as 'author_submitAndWatchExtrinsic'
        // are not included (and will not be re-broadcast)
        if (type.startsWith("author_")) {
          return
        }

        try {
          await this.subscribe(type, method, params, callback)
        } catch (error) {
          log.error(error)
        }
      })
    ).catch(log.error)
  }

  #timeoutHandlers = (): void => {
    const now = Date.now()
    const ids = Object.keys(this.#handlers)

    for (let i = 0; i < ids.length; i++) {
      const handler = this.#handlers[ids[i]]

      if (now - handler.start > this.#timeout) {
        try {
          handler.callback(
            new Error(`No response received from RPC endpoint in ${this.#timeout / 1000}s`),
            undefined
          )
        } catch {
          // ignore
        }

        delete this.#handlers[ids[i]]
      }
    }
  }
}
