import type { RpcTransport } from "@solana/kit"
import type { SolNetwork } from "@talismn/chaindata-provider"

import type { SolRpc } from "./getSolRpc"
import { getSolRpc, getSolTransport } from "./getSolRpc"
import type { IChainConnectorSol } from "./IChainConnectorSol"

export class ChainConnectorSolStub implements IChainConnectorSol {
  #network: Pick<SolNetwork, "id" | "rpcs">
  #rpc: SolRpc

  constructor(network: Pick<SolNetwork, "id" | "rpcs">) {
    this.#network = network
    this.#rpc = getSolRpc(network.id, network.rpcs)
  }

  async getRpc(): Promise<SolRpc> {
    return this.#rpc
  }

  async getTransport(): Promise<RpcTransport> {
    return getSolTransport(this.#network.id, this.#network.rpcs)
  }
}
