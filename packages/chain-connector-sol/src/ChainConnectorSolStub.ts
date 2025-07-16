import { Connection } from "@solana/web3.js"
import { SolNetworkId } from "@talismn/chaindata-provider"

import { getSolConnection } from "./getSolConnection"
import { IChainConnectorSol } from "./IChainConnectorSol"

export class ChainConnectorSolStub implements IChainConnectorSol {
  #networkId: SolNetworkId
  #rpcs: string[]

  constructor(networkId: SolNetworkId, rpcs: string[]) {
    this.#networkId = networkId
    this.#rpcs = rpcs
  }

  async getConnection(networkId: SolNetworkId): Promise<Connection | null> {
    if (networkId !== this.#networkId) return null

    return getSolConnection(networkId, this.#rpcs)
  }
}
