import {
  getWsProvider,
  type JsonRpcProvider,
  type StatusChange,
  WsEvent,
  type WsJsonRpcProvider,
} from "@polkadot-api/ws-provider"

export type WsProviderFactory = (
  endpoints: string | string[],
  config?: { onStatusChanged?: (status: StatusChange) => void }
) => WsJsonRpcProvider

type JsonRpcConnection = ReturnType<JsonRpcProvider>
type JsonRpcMessage = Parameters<Parameters<JsonRpcProvider>[0]>[0]

type Consumer = {
  onMessage: (message: JsonRpcMessage) => void
  onStatusChanged: (status: StatusChange) => void
}

type SharedSocket = {
  provider: WsJsonRpcProvider
  connection: JsonRpcConnection | null
  consumers: Set<Consumer>
  requests: Map<string, { consumer: Consumer; id: string | number }>
}

const CLOSED: StatusChange = { type: WsEvent.CLOSE, event: null }

/**
 * Returns a `WsProviderFactory` whose providers share one socket per endpoint list.
 *
 * Pass it to `ChainConnectorDot` and use it for the dapp's polkadot-api clients, so both run over the same socket.
 * Each consumer gets its own request ids and status events. Subscription notifications go to every consumer:
 * polkadot-api clients ignore the subscription ids they did not open.
 * The socket closes when its last consumer disconnects. `switch()` reconnects every consumer of the socket.
 *
 * `getBaseProvider` opens the socket, e.g. `getWsProvider` from `polkadot-api/ws` to keep its middleware.
 */
export const createSharedWsProvider = (
  getBaseProvider: WsProviderFactory = getWsProvider
): WsProviderFactory => {
  const sockets = new Map<string, SharedSocket>()
  let nextRequestId = 0

  const openSocket = (key: string, endpoints: string | string[]): SharedSocket => {
    const socket: SharedSocket = {
      provider: getBaseProvider(endpoints, {
        onStatusChanged: (status) => {
          for (const consumer of socket.consumers) consumer.onStatusChanged(status)
        },
      }),
      connection: null,
      consumers: new Set(),
      requests: new Map(),
    }
    sockets.set(key, socket)
    return socket
  }

  const routeMessage = (socket: SharedSocket, message: JsonRpcMessage) => {
    if ("method" in message) {
      for (const consumer of socket.consumers) consumer.onMessage(message)
      return
    }

    const request = socket.requests.get(String(message.id))
    if (!request) return
    socket.requests.delete(String(message.id))
    request.consumer.onMessage({ ...message, id: request.id })
  }

  return (endpoints, { onStatusChanged = () => {} } = {}) => {
    const key = JSON.stringify([endpoints].flat())
    const current = () => sockets.get(key)

    const connect: JsonRpcProvider = (onMessage) => {
      const socket = current() ?? openSocket(key, endpoints)
      const consumer: Consumer = { onMessage, onStatusChanged }
      socket.consumers.add(consumer)
      socket.connection ??= socket.provider((message) => routeMessage(socket, message))
      const connection = socket.connection

      return {
        send: (message) => {
          if (message.id === undefined || message.id === null) return connection.send(message)

          const id = `shared-${nextRequestId++}`
          socket.requests.set(id, { consumer, id: message.id })
          connection.send({ ...message, id })
        },
        disconnect: () => {
          if (!socket.consumers.delete(consumer)) return
          for (const [id, request] of socket.requests)
            if (request.consumer === consumer) socket.requests.delete(id)
          if (socket.consumers.size) return

          sockets.delete(key)
          connection.disconnect()
        },
      }
    }

    return Object.assign(connect, {
      switch: (uri?: string) => current()?.provider.switch(uri),
      getStatus: () => current()?.provider.getStatus() ?? CLOSED,
    })
  }
}
