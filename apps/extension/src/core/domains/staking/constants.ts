import { EvmNetworkId } from "@talismn/chaindata-provider"

import {
  EvmLsdSupportedChain,
  EvmLsdSupportedPair,
  NomPoolSupportedChain,
  StakingSupportedChain,
} from "./types"

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

export const EVM_LSD_PAIRS: Record<EvmNetworkId, Record<string, EvmLsdSupportedPair>> = {
  "1": {
    "1-eth-steth": {
      base: "1-evm-native",
      derivative: "1-evm-erc20-0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
    },
  },
}

export const EVM_LSD_SUPPORTED_CHAINS: EvmLsdSupportedChain[] = ["1"]

export const STAKING_BANNER_CHAINS: StakingSupportedChain[] = [
  ...NOM_POOL_SUPPORTED_CHAINS,
  ...EVM_LSD_SUPPORTED_CHAINS,
]
