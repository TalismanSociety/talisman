import { Connection } from "@solana/web3.js"
import {
  EthNetworkId,
  IChaindataNetworkProvider,
  IChaindataTokenProvider,
} from "@talismn/chaindata-provider"

import log from "./log"

export class ChainConnectorSol {
  #chaindataProvider: IChaindataNetworkProvider & IChaindataTokenProvider

  constructor(chaindataProvider: IChaindataNetworkProvider & IChaindataTokenProvider) {
    this.#chaindataProvider = chaindataProvider
  }

  async getConnector(evmNetworkId: EthNetworkId): Promise<Connection | null> {
    const network = await this.#chaindataProvider.getNetworkById(evmNetworkId, "solana")
    if (!network) return null

    // Try each RPC URL until one works
    for (const rpcUrl of network.rpcs) {
      try {
        const connection = new Connection(rpcUrl, "confirmed")
        // Test the connection with a lightweight call
        await connection.getSlot()
        return connection
      } catch (error) {
        log.warn(`Failed to connect to Solana RPC ${rpcUrl}:`, error)
        continue
      }
    }

    log.error(`All Solana RPC endpoints failed for network ${evmNetworkId}`)
    return null
  }
}
