import type { RpcTransport } from "@solana/kit"
import type { Connection } from "@solana/web3.js"
import type { SolNetworkId } from "@talismn/chaindata-provider"

import type { SolRpc } from "./getSolRpc"

export interface IChainConnectorSol {
  getRpc: (networkId: SolNetworkId) => Promise<SolRpc>
  /** Raw JSON-RPC transport, used by the background script to relay frontend RPC requests */
  getTransport: (networkId: SolNetworkId) => Promise<RpcTransport>
  /** @deprecated migrating to `getRpc`, kept until spl-token helpers are replaced */
  getConnection: (networkId: SolNetworkId) => Promise<Connection>
}
