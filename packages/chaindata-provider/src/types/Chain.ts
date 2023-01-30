import { EvmNetworkId } from "./EvmNetwork"
import { TokenId } from "./Token"

export type ChainList = Record<ChainId, Chain | CustomChain>

export type ChainId = string
export type Chain = {
  id: ChainId // The ID of this chain
  isTestnet: boolean // Is this chain a testnet?
  sortIndex: number | null // The sortIndex of this chain
  genesisHash: string | null // The genesisHash of this chain
  prefix: number | null // The substrate prefix of this chain
  name: string | null // The name of this chain
  logo: string | null // A url to the logo of this chain
  chainName: string // The on-chain name of this chain
  implName: string | null // The implementation name of this chain
  specName: string | null // The spec name of this chain
  specVersion: string | null // The spec version of this chain
  nativeToken: { id: TokenId } | null // The nativeToken of this chain
  tokens: Array<{ id: TokenId }> | null // The ORML tokens for this chain
  account: string | null // The account address format of this chain
  subscanUrl: string | null // The subscan endpoint of this chain
  rpcs: Array<SubstrateRpc> | null // Some public RPCs for connecting to this chain's network
  isHealthy: boolean // The health status of this chain's RPCs
  evmNetworks: Array<{ id: EvmNetworkId }>

  parathreads?: Chain[] // The parathreads of this relayChain, if some exist

  paraId: number | null // The paraId of this chain, if it is a parachain
  relay?: Chain // The parent relayChain of this parachain, if this chain is a parachain

  balanceMetadata: Array<{ moduleType: string; metadata: any }>
}
export type CustomChain = Chain & {
  isCustom: true
}

export type SubstrateRpc = {
  url: string // The url of this RPC
  isHealthy: boolean // The health status of this RPC
}
