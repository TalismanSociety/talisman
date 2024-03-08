import { EvmLsdSupportedChain, NomPoolSupportedChain, StakingSupportedChain } from "@extension/core"
import { EVM_LSD_SUPPORTED_CHAINS, NOM_POOL_SUPPORTED_CHAINS } from "@extension/core"

type Colours = {
  text: string
  background: string
}

export const colours: Record<StakingSupportedChain, Colours> = {
  "polkadot": {
    text: "text-[#cc2c75]",
    background: "bg-[#260001]",
  },
  "kusama": {
    text: "text-body-secondary",
    background: "bg-[#303030]",
  },
  "aleph-zero": {
    text: "text-[#e5ff57]",
    background: "bg-[#2C2D30]",
  },
  "vara": {
    text: "text-[#00a87a]",
    background: "bg-[#002905]",
  },
  "1": {
    text: "text-[#8b93b4]",
    background: "bg-[#151C2F]",
  },
}

export const isNomPoolChain = (chainId: string): chainId is NomPoolSupportedChain =>
  NOM_POOL_SUPPORTED_CHAINS.includes(chainId as NomPoolSupportedChain)

export const isEvmLsdChain = (networkId: string): networkId is EvmLsdSupportedChain =>
  EVM_LSD_SUPPORTED_CHAINS.includes(networkId as EvmLsdSupportedChain)

export const isStakingSupportedChain = (chainId: string): chainId is StakingSupportedChain =>
  isNomPoolChain(chainId) || isEvmLsdChain(chainId)
