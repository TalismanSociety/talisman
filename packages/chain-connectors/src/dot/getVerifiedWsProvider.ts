import {
  getWsProvider,
  type Middleware,
  type StatusChange,
  WsEvent,
  type WsJsonRpcProvider,
} from "@polkadot-api/ws-provider"

import { getIdentityVerdict, isKnownMismatch } from "../rpcIdentity"
import { chainIdentityGate } from "./chainIdentityGate"

export type VerifiedWsProviderOptions = {
  networkId: string
  rpcs: readonly string[]
  /** The network's genesis hash. Without one, the RPCs are used unverified. */
  genesisHash: string | undefined
  /**
   * Wraps each connection above the identity check, so nothing it sends
   * reaches an RPC that has yet to pass. Used with or without a genesis hash.
   */
  middleware?: Middleware
  onStatusChanged?: (status: StatusChange) => void
}

/**
 * A ws provider over the network's RPCs that only talks to the ones serving
 * the network's genesis hash (see `chainIdentityGate`). It connects to them in
 * turn, moving to the next one when a connection fails, goes stale or turns
 * out to serve another chain. RPCs already known to serve another chain are
 * left out of the list, unless that leaves none.
 *
 * CONNECTED is reported once per connection, when its RPC has passed the
 * check, rather than when the socket opens.
 */
export const getVerifiedWsProvider = ({
  networkId,
  rpcs,
  genesisHash,
  middleware,
  onStatusChanged,
}: VerifiedWsProviderOptions): WsJsonRpcProvider => {
  if (!genesisHash)
    // getWsProvider spreads its config over its defaults, so an option given as
    // undefined replaces the default with undefined
    return getWsProvider(rpcs.concat(), {
      ...(middleware && { middleware }),
      ...(onStatusChanged && { onStatusChanged }),
    })

  const candidates = rpcs.filter((rpc) => !isKnownMismatch(networkId, rpc))
  const endpoints = candidates.length ? candidates : rpcs.concat()

  let connectingUri: string | undefined
  let announced = false
  const announceConnected = (uri: string) => {
    if (announced || uri !== connectingUri) return
    announced = true
    onStatusChanged?.({ type: WsEvent.CONNECTED, uri })
  }

  const gate = chainIdentityGate({
    networkId,
    genesisHash,
    getUri: () => connectingUri,
    onMatch: announceConnected,
  })

  return getWsProvider(endpoints, {
    middleware: middleware ? (base) => middleware(gate(base)) : gate,
    onStatusChanged: (status) => {
      if (status.type === WsEvent.CONNECTING) {
        connectingUri = status.uri
        announced = false
      }
      if (status.type === WsEvent.CONNECTED) {
        // an RPC that has yet to pass the gate is announced by its onMatch
        if (getIdentityVerdict(networkId, status.uri) === "match") announceConnected(status.uri)
        return
      }
      onStatusChanged?.(status)
    },
  })
}
