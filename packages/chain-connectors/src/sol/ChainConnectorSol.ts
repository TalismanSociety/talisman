import type { Connection } from "@solana/web3.js"
import type {
  IChaindataNetworkProvider,
  IChaindataTokenProvider,
  SolNetworkId,
} from "@talismn/chaindata-provider"

import { getSolConnection } from "./getSolConnection"
import type { IChainConnectorSol } from "./IChainConnectorSol"

export class ChainConnectorSol implements IChainConnectorSol {
  #chaindataProvider: IChaindataNetworkProvider & IChaindataTokenProvider

  constructor(chaindataProvider: IChaindataNetworkProvider & IChaindataTokenProvider) {
    this.#chaindataProvider = chaindataProvider
  }

  async getConnection(networkId: SolNetworkId): Promise<Connection> {
    const network = await this.#chaindataProvider.getNetworkById(networkId, "solana")
    if (!network) throw new Error(`Network not found: ${networkId}`)

    return getSolConnection(networkId, network.rpcs)
  }
}
