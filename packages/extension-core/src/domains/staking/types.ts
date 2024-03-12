export type NomPoolSupportedChain = "polkadot" | "kusama" | "aleph-zero" | "vara"
export type EvmLsdSupportedPair = { base: string; derivative: string }
export type EvmLsdSupportedChain = "1"
export type StakingSupportedChain = NomPoolSupportedChain | EvmLsdSupportedChain
