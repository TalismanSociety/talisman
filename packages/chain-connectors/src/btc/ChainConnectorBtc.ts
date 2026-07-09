import type { BtcApi } from "@talismn/bitcoin"
import { createEsploraClient } from "@talismn/bitcoin"
import type { BtcNetworkId, IChaindataNetworkProvider } from "@talismn/chaindata-provider"

import type { IChainConnectorBtc } from "./IChainConnectorBtc"

export class ChainConnectorBtc implements IChainConnectorBtc {
  #chaindataProvider: IChaindataNetworkProvider
  #apis = new Map<BtcNetworkId, BtcApi>()

  constructor(chaindataProvider: IChaindataNetworkProvider) {
    this.#chaindataProvider = chaindataProvider
  }

  async getApi(networkId: BtcNetworkId): Promise<BtcApi> {
    if (!this.#apis.has(networkId)) {
      const network = await this.#chaindataProvider.getNetworkById(networkId, "bitcoin")
      if (!network) throw new Error(`Network not found: ${networkId}`)
      this.#apis.set(networkId, createEsploraClient(network.rpcs))
    }

    return this.#apis.get(networkId)!
  }

  /** Drops cached clients so the next call re-reads the network's rpcs from chaindata */
  clearRpcProvidersCache(networkId?: BtcNetworkId) {
    if (networkId) this.#apis.delete(networkId)
    else this.#apis.clear()
  }
}
