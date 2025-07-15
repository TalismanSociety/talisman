import { Connection } from "@solana/web3.js"
import { IChaindataNetworkProvider, IChaindataTokenProvider } from "@talismn/chaindata-provider"
import { SolNetworkId } from "@talismn/chaindata-provider/src/chaindata/networks/SolNetwork"

import { getSolConnection } from "./getSolConnection"
import { IChainConnectorSol } from "./IChainConnectorSol"

export class ChainConnectorSol implements IChainConnectorSol {
  #chaindataProvider: IChaindataNetworkProvider & IChaindataTokenProvider

  constructor(chaindataProvider: IChaindataNetworkProvider & IChaindataTokenProvider) {
    this.#chaindataProvider = chaindataProvider
  }

  async getConnection(networkId: SolNetworkId): Promise<Connection | null> {
    const network = await this.#chaindataProvider.getNetworkById(networkId, "solana")
    if (!network) return null

    return getSolConnection(networkId, network.rpcs)
  }
}
