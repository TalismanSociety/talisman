import type { Connection } from "@solana/web3.js"
import type { SolNetwork } from "@talismn/chaindata-provider"

import { getSolConnection } from "./getSolConnection"
import type { IChainConnectorSol } from "./IChainConnectorSol"

export class ChainConnectorSolStub implements IChainConnectorSol {
  #connection: Connection

  constructor(networkOrConnection: Pick<SolNetwork, "id" | "rpcs"> | Connection) {
    // NOTE: do not use `instanceof Connection` here. In bundled builds @solana/web3.js
    // can be duplicated across chunks, so a Connection created from one copy of the
    // module fails an `instanceof` check against another copy's class. That silently
    // fell through to getSolConnection() with an undefined `rpcs`, throwing
    // "Cannot read properties of undefined (reading '0')" and breaking every Solana
    // transfer. Duck-type on the network-only `rpcs` field instead (a Connection never
    // has it), which is robust regardless of how many module instances exist.
    this.#connection =
      "rpcs" in networkOrConnection
        ? getSolConnection(networkOrConnection.id, networkOrConnection.rpcs)
        : networkOrConnection
  }

  async getConnection(): Promise<Connection> {
    return this.#connection
  }
}
