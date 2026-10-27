import type { EthNetwork } from "@talismn/chaindata-provider"
import { fallback, http, shouldThrow, type Transport } from "viem"

import {
  evmChainIdMatches,
  getIdentityVerdict,
  recordIdentityVerdict,
  withTimeout,
} from "../rpcIdentity"

export type TransportOptions = {
  batch?:
    | boolean
    | {
        batchSize?: number | undefined
        wait?: number | undefined
      }
}

// Frontier nodes report reverts with a message viem does not recognize, which makes fallback retry every rpc
const FRONTIER_EXECUTION_ERROR = /VM Exception while processing transaction/

const isFinalError = (error: Error) =>
  shouldThrow(error) || FRONTIER_EXECUTION_ERROR.test(error.message)

/** How long the `eth_chainId` probe of an RPC may take */
const IDENTITY_PROBE_TIMEOUT_MS = 5_000

/** In-flight probes, shared by every client of the network */
const probes = new Map<string, Promise<boolean>>()

/** Whether the RPC serves `chainId`; throws when it could not be asked */
const servesChain = (networkId: string, chainId: number, url: string): Promise<boolean> => {
  const verdict = getIdentityVerdict(networkId, url)
  if (verdict) return Promise.resolve(verdict === "match")

  const key = `${networkId}|${url}`
  let probe = probes.get(key)
  if (!probe) {
    probe = withTimeout(
      http(url, { retryCount: 0, timeout: IDENTITY_PROBE_TIMEOUT_MS })({ retryCount: 0 }).request({
        method: "eth_chainId",
      }),
      IDENTITY_PROBE_TIMEOUT_MS,
      `eth_chainId ${url}`
    )
      .then((answer) => {
        const matches = evmChainIdMatches(chainId, answer)
        recordIdentityVerdict(networkId, url, matches ? "match" : "mismatch")
        return matches
      })
      .finally(() => probes.delete(key))
    probes.set(key, probe)
  }
  return probe
}

/**
 * Wraps an RPC's transport so it is sent nothing until it has answered
 * `eth_chainId` with `chainId`. An RPC of another chain, or one whose probe
 * fails, throws an error that `fallback` treats as that RPC failing, so the
 * request moves on to the next RPC.
 */
const verifiedTransport =
  (networkId: string, chainId: number, url: string, transport: Transport): Transport =>
  (params) => {
    const inner = transport(params)
    return {
      ...inner,
      request: (async (args, options) => {
        if (!(await servesChain(networkId, chainId, url)))
          throw new Error(`RPC ${url} does not serve chain ${chainId}`)
        return inner.request(args, options)
      }) as typeof inner.request,
    }
  }

/**
 * A transport over the network's RPCs, in order, moving on to the next one when
 * a request fails for a reason other than the request itself.
 *
 * The network id is its chain id: each RPC is asked for `eth_chainId` before
 * its first use and skipped when it serves another chain. The verdict is kept
 * for the process (see `rpcIdentity`), and concurrent requests share one probe.
 * A network whose id is not a chain id is used unverified.
 */
export const getTransportForEvmNetwork = (
  evmNetwork: EthNetwork,
  options: TransportOptions = {}
) => {
  if (!evmNetwork.rpcs?.length) throw new Error("No RPCs found for EVM network")

  const { batch } = options

  const chainId = Number(evmNetwork.id)
  const verifiable = Number.isSafeInteger(chainId) && chainId > 0

  return fallback(
    evmNetwork.rpcs.map((url) => {
      const transport = http(url, { batch, retryCount: 0 })
      return verifiable ? verifiedTransport(evmNetwork.id, chainId, url, transport) : transport
    }),
    { retryCount: 0, shouldThrow: isFinalError }
  )
}
