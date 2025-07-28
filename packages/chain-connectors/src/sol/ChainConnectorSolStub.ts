import { Connection } from "@solana/web3.js"
import { isNetworkSol, SolNetwork } from "@talismn/chaindata-provider"

import { getSolConnection } from "./getSolConnection"
import { IChainConnectorSol } from "./IChainConnectorSol"

export class ChainConnectorSolStub implements IChainConnectorSol {
  #connection: Connection

  constructor(networkOrConnection: SolNetwork | Connection) {
    this.#connection =
      "platform" in networkOrConnection && isNetworkSol(networkOrConnection)
        ? getSolConnection(networkOrConnection.id, networkOrConnection.rpcs)
        : networkOrConnection
  }

  async getConnection(): Promise<Connection> {
    return this.#connection
  }
}
