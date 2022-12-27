import { ChainId } from "./Chain"
import { EvmNetworkId } from "./EvmNetwork"

export type MultiChainId = SubChainId | EvmChainId
export type SubChainId = { subChainId: ChainId }
export type EvmChainId = { evmChainId: EvmNetworkId }
