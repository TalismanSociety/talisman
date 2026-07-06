import type { RpcTransport } from "@solana/kit"
import { createSolanaRpcFromTransport } from "@solana/kit"
import type { SolNetwork } from "@talismn/chaindata-provider"

import type { SolRpc } from "./getSolRpc"
import { getSolTransport } from "./getSolRpc"
import type { IChainConnectorSol } from "./IChainConnectorSol"

export class ChainConnectorSolStub implements IChainConnectorSol {
  #transport: RpcTransport
  #rpc: SolRpc

  constructor(network: Pick<SolNetwork, "id" | "rpcs">) {
    this.#transport = getSolTransport(network.id, network.rpcs)
    this.#rpc = createSolanaRpcFromTransport(this.#transport)
  }

  async getRpc(): Promise<SolRpc> {
    return this.#rpc
  }

  async getTransport(): Promise<RpcTransport> {
    return this.#transport
  }
}
