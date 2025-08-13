import { EthNetworkId } from "@talismn/chaindata-provider"
import { Account, PublicClient, WalletClient } from "viem"

export interface IChainConnectorEth {
  getPublicClientForEvmNetwork: (evmNetworkId: EthNetworkId) => Promise<PublicClient | null>
  getWalletClientForEvmNetwork: (
    evmNetworkId: EthNetworkId,
    account?: `0x${string}` | Account,
  ) => Promise<WalletClient | null>
  clearRpcProvidersCache: (evmNetworkId?: EthNetworkId) => void
}
