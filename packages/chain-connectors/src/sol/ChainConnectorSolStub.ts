import { Connection } from "@solana/web3.js"
import { SolNetwork } from "@talismn/chaindata-provider"

import { getSolConnection } from "./getSolConnection"
import { IChainConnectorSol } from "./IChainConnectorSol"

export class ChainConnectorSolStub implements IChainConnectorSol {
  #connection: Connection

  constructor(networkOrConnection: Pick<SolNetwork, "id" | "rpcs"> | Connection) {
    this.#connection =
      networkOrConnection instanceof Connection
        ? networkOrConnection
        : getSolConnection(networkOrConnection.id, networkOrConnection.rpcs)
  }

  async getConnection(): Promise<Connection> {
    return this.#connection
  }
}
