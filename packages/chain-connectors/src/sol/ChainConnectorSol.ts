import type { RpcTransport } from "@solana/kit"
import { createSolanaRpcFromTransport } from "@solana/kit"
import type {
  IChaindataNetworkProvider,
  IChaindataTokenProvider,
  SolNetworkId,
} from "@talismn/chaindata-provider"

import type { SolRpc } from "./getSolRpc"
import { getSolTransport } from "./getSolRpc"
import type { IChainConnectorSol } from "./IChainConnectorSol"

export class ChainConnectorSol implements IChainConnectorSol {
  #chaindataProvider: IChaindataNetworkProvider & IChaindataTokenProvider
  #transports = new Map<SolNetworkId, RpcTransport>()
  #rpcs = new Map<SolNetworkId, SolRpc>()

  constructor(chaindataProvider: IChaindataNetworkProvider & IChaindataTokenProvider) {
    this.#chaindataProvider = chaindataProvider
  }

  async #getNetworkRpcs(networkId: SolNetworkId): Promise<string[]> {
    const network = await this.#chaindataProvider.getNetworkById(networkId, "solana")
    if (!network) throw new Error(`Network not found: ${networkId}`)

    return network.rpcs
  }

  async getTransport(networkId: SolNetworkId): Promise<RpcTransport> {
    if (!this.#transports.has(networkId))
      this.#transports.set(
        networkId,
        getSolTransport(networkId, await this.#getNetworkRpcs(networkId))
      )

    return this.#transports.get(networkId)!
  }

  async getRpc(networkId: SolNetworkId): Promise<SolRpc> {
    if (!this.#rpcs.has(networkId))
      this.#rpcs.set(networkId, createSolanaRpcFromTransport(await this.getTransport(networkId)))

    return this.#rpcs.get(networkId)!
  }
}
