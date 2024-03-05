import { EVM_LSD_SUPPORTED_CHAINS, NOM_POOL_SUPPORTED_CHAINS } from "./constants"
import { EvmLsdSupportedChain, NomPoolSupportedChain, StakingSupportedChain } from "./types"

export const isNomPoolChain = (chainId: string): chainId is NomPoolSupportedChain =>
  NOM_POOL_SUPPORTED_CHAINS.includes(chainId as NomPoolSupportedChain)

export const isEvmLsdChain = (networkId: string): networkId is EvmLsdSupportedChain =>
  EVM_LSD_SUPPORTED_CHAINS.includes(networkId as EvmLsdSupportedChain)

export const isStakingSupportedChain = (chainId: string): chainId is StakingSupportedChain =>
  isNomPoolChain(chainId) || isEvmLsdChain(chainId)
