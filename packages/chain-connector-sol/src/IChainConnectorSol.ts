import { Connection } from "@solana/web3.js"
import { SolNetworkId } from "@talismn/chaindata-provider/src/chaindata/networks/SolNetwork"

export interface IChainConnectorSol {
  getConnection: (networkId: SolNetworkId) => Promise<Connection | null>
}
