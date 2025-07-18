import { Connection } from "@solana/web3.js"
import { SolNetwork } from "@talismn/chaindata-provider"

import { getSolConnection } from "./getSolConnection"
import { IChainConnectorSol } from "./IChainConnectorSol"

export class ChainConnectorSolStub implements IChainConnectorSol {
  #connection: Connection

  constructor(network: SolNetwork) {
    this.#connection = getSolConnection(network.id, network.rpcs)
  }

  async getConnection(): Promise<Connection> {
    return this.#connection
  }
}
