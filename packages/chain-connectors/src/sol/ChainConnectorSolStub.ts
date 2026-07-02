import type { RpcTransport } from "@solana/kit"
import type { Connection } from "@solana/web3.js"
import type { SolNetwork } from "@talismn/chaindata-provider"

import { getSolConnection } from "./getSolConnection"
import type { SolRpc } from "./getSolRpc"
import { getSolRpc, getSolTransport } from "./getSolRpc"
import type { IChainConnectorSol } from "./IChainConnectorSol"

export class ChainConnectorSolStub implements IChainConnectorSol {
  #network: Pick<SolNetwork, "id" | "rpcs"> | null
  #connection: Connection

  constructor(networkOrConnection: Pick<SolNetwork, "id" | "rpcs"> | Connection) {
    // NOTE: do not use `instanceof Connection` here. In bundled builds @solana/web3.js
    // can be duplicated across chunks, so a Connection created from one copy of the
    // module fails an `instanceof` check against another copy's class. That silently
    // fell through to getSolConnection() with an undefined `rpcs`, throwing
    // "Cannot read properties of undefined (reading '0')" and breaking every Solana
    // transfer. Duck-type on the network-only `rpcs` field instead (a Connection never
    // has it), which is robust regardless of how many module instances exist.
    if ("rpcs" in networkOrConnection) {
      this.#network = networkOrConnection
      this.#connection = getSolConnection(networkOrConnection.id, networkOrConnection.rpcs)
    } else {
      this.#network = null
      this.#connection = networkOrConnection
    }
  }

  async getRpc(): Promise<SolRpc> {
    if (!this.#network) throw new Error("getRpc is not available on a Connection-based stub")
    return getSolRpc(this.#network.id, this.#network.rpcs)
  }

  async getTransport(): Promise<RpcTransport> {
    if (!this.#network) throw new Error("getTransport is not available on a Connection-based stub")
    return getSolTransport(this.#network.id, this.#network.rpcs)
  }

  async getConnection(): Promise<Connection> {
    return this.#connection
  }
}
