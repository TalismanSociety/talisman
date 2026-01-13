import type { Connection } from "@solana/web3.js"
import type { SolNetworkId } from "@talismn/chaindata-provider"

export interface IChainConnectorSol {
  getConnection: (networkId: SolNetworkId) => Promise<Connection>
}
