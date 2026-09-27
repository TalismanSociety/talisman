import { createSolanaRpcFromTransport, type RpcTransport } from "@solana/kit"
import type { IChainConnectorSol } from "@talismn/chain-connectors"

type JsonRpcRequest = { id: string | number; method: string; params: unknown[] }

export type SolanaRpcRequest = Pick<JsonRpcRequest, "method" | "params">

/** Thrown by a handler to answer with a "node is unhealthy" JSON-RPC error instead of a result */
export class NodeUnhealthyError extends Error {}

/**
 * A real kit RPC over a fake transport: `handler` returns the raw JSON-RPC `result` (as served by a
 * node, e.g. a recorded response), so kit's own response transformers (bigint upcasting) still run.
 */
export const createFakeSolanaRpc = (handler: (request: SolanaRpcRequest) => unknown) => {
  const requests: SolanaRpcRequest[] = []

  const transport = (async ({ payload }: { payload: unknown }) => {
    const { id, method, params } = payload as JsonRpcRequest
    requests.push({ method, params })
    try {
      return { jsonrpc: "2.0", id, result: handler({ method, params }) }
    } catch (err) {
      if (!(err instanceof NodeUnhealthyError)) throw err
      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32005, message: "Node is behind", data: { numSlotsBehind: 42 } },
      }
    }
  }) as RpcTransport

  const connector: IChainConnectorSol = {
    getRpc: async () => createSolanaRpcFromTransport(transport),
    getTransport: async () => transport,
  }

  return { connector, requests }
}
