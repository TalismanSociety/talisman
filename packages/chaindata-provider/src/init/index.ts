import type { MiniMetadata } from "@talismn/balances"
import type { Chain, EvmNetwork, Token } from "@talismn/chaindata-provider"

import { chains as initChains } from "./chains"
import { evmNetworks as initEvmNetworks } from "./evm-networks"
import { miniMetadatas as initMiniMetadatas } from "./mini-metadatas"
import { tokens as initSubstrateTokens } from "./tokens"

// The init files imported in this module are generated by a script.
//
// They are used in two places:
// 1. As fallbacks for fresh installations who are unable to pull an initial set of data from the upstream chaindata repo.
// 2. As mock data for tests.
//
// They should be periodically updated with the latest state of chaindata.
// You can update them by running the following command:
// `yarn workspace @talismn/chaindata-provider generate-init-data`

export const fetchInitChains = async (): Promise<Chain[]> => initChains as Chain[]
export const fetchInitEvmNetworks = async (): Promise<EvmNetwork[]> => initEvmNetworks
export const fetchInitSubstrateTokens = async (): Promise<Token[]> => initSubstrateTokens as Token[]
export const fetchInitMiniMetadatas = async (): Promise<MiniMetadata[]> =>
  initMiniMetadatas as MiniMetadata[]
