import type { InnerJsonRpcProvider, Middleware } from "@polkadot-api/ws-provider"

import { genesisHashMatches, getIdentityVerdict, recordIdentityVerdict } from "../rpcIdentity"

type Connection = ReturnType<InnerJsonRpcProvider>
type OutgoingMessage = Parameters<Connection["send"]>[0]

/**
 * How long a new connection may take to open and answer the genesis hash
 * probe. It includes the socket's own 5 s connect timeout, so it must be
 * longer than that.
 */
const IDENTITY_PROBE_TIMEOUT_MS = 10_000

/** Asked first, then the new JSON-RPC spec method for nodes without the legacy one */
const PROBE_METHODS = ["chain_getBlockHash", "chainSpec_v1_genesisHash"] as const
const PROBE_PARAMS: Record<(typeof PROBE_METHODS)[number], unknown[]> = {
  chain_getBlockHash: [0],
  chainSpec_v1_genesisHash: [],
}

let nextProbeId = 0

export type ChainIdentityGateOptions = {
  networkId: string
  /** The genesis hash every RPC of the network must report */
  genesisHash: string
  /**
   * The RPC the connection being opened goes to: the `uri` of the ws
   * provider's latest CONNECTING status, which it emits synchronously while
   * opening the socket.
   */
  getUri: () => string | undefined
  /** Called when a connection's RPC is found to serve the network and messages start to flow */
  onMatch?: (uri: string) => void
  probeTimeoutMs?: number
}

/**
 * A ws-provider middleware that keeps every message from reaching an RPC
 * until that RPC has reported the network's genesis hash.
 *
 * It wraps each connection the provider opens. The first message on a
 * connection is a genesis hash probe; everything sent meanwhile is held, and
 * replies other than the probe's are dropped. On a match the held messages go
 * out in order and the connection passes messages through from then on. On a
 * mismatch, an error or no answer within `probeTimeoutMs`, the connection is
 * closed and halted, and the provider moves on to its next RPC. The provider
 * re-sends its ongoing requests on every new connection, so nothing is lost,
 * and nothing is sent to an RPC of another chain.
 *
 * This has to sit at the connection level: the provider's re-sends on
 * reconnection happen below anything a status callback or a wrapper around
 * the whole provider could hold back.
 *
 * Verdicts are cached per RPC (see `rpcIdentity`). An RPC already known to
 * match is passed through without a probe; one known to mismatch is halted
 * straight away. A timeout or an error records no verdict, so the RPC is
 * probed again the next time the provider comes back to it.
 */
export const chainIdentityGate =
  ({
    networkId,
    genesisHash,
    getUri,
    onMatch,
    probeTimeoutMs = IDENTITY_PROBE_TIMEOUT_MS,
  }: ChainIdentityGateOptions): Middleware =>
  (base) =>
  (onMessage, onHalt) => {
    let state: "probing" | "open" | "closed" = "probing"
    let held: OutgoingMessage[] = []
    let probeId: string | undefined
    let methodIndex = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    const close = () => {
      state = "closed"
      held = []
      clearTimeout(timer)
    }

    const reject = (reason: string) => {
      if (state === "closed") return
      close()
      connection.disconnect()
      onHalt({ type: "chain-identity", reason })
    }

    const sendProbe = () => {
      const method = PROBE_METHODS[methodIndex]!
      probeId = `talisman-chain-identity-${nextProbeId++}`
      connection.send({ jsonrpc: "2.0", id: probeId, method, params: PROBE_PARAMS[method] })
    }

    const onProbeResponse = (message: Record<string, unknown>) => {
      if ("error" in message || typeof message.result !== "string") {
        methodIndex++
        if (methodIndex < PROBE_METHODS.length) return sendProbe()
        return reject("the RPC did not report a genesis hash")
      }

      const matches = genesisHashMatches(genesisHash, message.result)
      if (uri) recordIdentityVerdict(networkId, uri, matches ? "match" : "mismatch")
      if (!matches) return reject("the RPC serves another chain")

      clearTimeout(timer)
      state = "open"
      const queued = held
      held = []
      for (const msg of queued) connection.send(msg)
      if (uri) onMatch?.(uri)
    }

    // `base` opens the socket, which sets the uri `getUri` reads
    const connection = base(
      (message) => {
        if (state === "open") return onMessage(message)
        if (state === "probing" && "id" in message && message.id === probeId)
          onProbeResponse(message as Record<string, unknown>)
      },
      (error) => {
        if (state === "closed") return
        close()
        onHalt(error)
      }
    )
    const uri = getUri()

    const verdict = uri ? getIdentityVerdict(networkId, uri) : undefined
    if (verdict === "match") {
      state = "open"
    } else if (verdict === "mismatch") {
      // the provider's proxy is still wiring up this connection when it is
      // returned, so the halt waits for the next tick
      timer = setTimeout(() => reject("the RPC serves another chain"), 0)
    } else {
      timer = setTimeout(() => reject("genesis hash probe timed out"), probeTimeoutMs)
      sendProbe()
    }

    return {
      send: (message) => {
        if (state === "open") connection.send(message)
        else if (state === "probing") held.push(message)
      },
      disconnect: () => {
        if (state === "closed") return
        close()
        connection.disconnect()
      },
    }
  }
