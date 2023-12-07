import { NomPoolSupportedChain } from "./types"

export const NOM_POOL_SUPPORTED_CHAINS: NomPoolSupportedChain[] = [
  "polkadot",
  "kusama",
  "aleph-zero",
  "vara",
]
export const NOM_POOL_MIN_DEPOSIT: Record<NomPoolSupportedChain, string> = {
  "polkadot": "10000000000",
  "kusama": "001667000000",
  "aleph-zero": "100000000000",
  "vara": "100000000000",
}

export const STAKING_BANNER_CHAINS = [...NOM_POOL_SUPPORTED_CHAINS]
