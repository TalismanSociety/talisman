import { existsSync, readFileSync, writeFileSync } from "node:fs"

import { BALANCE_MODULES } from "@talismn/balances"
import { ChainConnectorSolStub, type IChainConnectorSol } from "@talismn/chain-connectors"
import type { Token, TokenType } from "@talismn/chaindata-provider"

import type { SolNetworkConfig } from "./testSubscribeBalancesSol"

export type ModuleSetupSol = {
  connector: IChainConnectorSol
  tokens: Token[]
  networkId: string
}

/**
 * Sets up a Solana balance module for testing by fetching tokens
 */
export const setupModuleSol = async (
  network: SolNetworkConfig,
  moduleType: TokenType
): Promise<ModuleSetupSol> => {
  const connector = new ChainConnectorSolStub(network)

  const networkId = network.id

  // Get the module
  const mod = BALANCE_MODULES.find((m) => m.type === moduleType && m.platform === "solana")
  if (!mod) {
    throw new Error(`Module ${moduleType} not found`)
  }

  // Load or create cache
  const cacheFilePath = `./cache/${moduleType}.json`
  const cache = existsSync(cacheFilePath) ? JSON.parse(readFileSync(cacheFilePath, "utf-8")) : {}

  // Fetch tokens
  const tokenConfigs =
    moduleType === "sol-native" ? [network.nativeCurrency] : (network.tokens[moduleType] ?? [])

  // Solana modules don't require miniMetadata, only substrate modules do
  // Type assertion needed because TypeScript sees union of all module types
  const tokens = await (
    mod.fetchTokens as (params: {
      networkId: string
      tokens: unknown[]
      connector: IChainConnectorSol
      cache?: Record<string, unknown>
    }) => Promise<Token[]>
  )({
    networkId,
    tokens: tokenConfigs,
    connector,
    cache,
  })

  // Save cache
  writeFileSync(cacheFilePath, JSON.stringify(cache, null, 2))

  return {
    connector,
    tokens,
    networkId,
  }
}
