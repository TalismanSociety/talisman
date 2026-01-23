import { existsSync, readFileSync, writeFileSync } from "node:fs"

import { BALANCE_MODULES } from "@talismn/balances"
import { ChainConnectorEthStub, type IChainConnectorEth } from "@talismn/chain-connectors"
import type { EthNetwork, Token, TokenType } from "@talismn/chaindata-provider"

import type { EthNetworkConfig } from "./testSubscribeBalancesEth"

export type ModuleSetupEth = {
  connector: IChainConnectorEth
  tokens: Token[]
  networkId: string
}

/**
 * Sets up an EVM balance module for testing by fetching tokens
 */
export const setupModuleEth = async (
  network: EthNetworkConfig,
  moduleType: TokenType
): Promise<ModuleSetupEth> => {
  const connector = new ChainConnectorEthStub(network as unknown as EthNetwork)

  const networkId = network.id

  // Get the module
  const mod = BALANCE_MODULES.find((m) => m.type === moduleType && m.platform === "ethereum")
  if (!mod) {
    throw new Error(`Module ${moduleType} not found`)
  }

  // Load or create cache
  const cacheFilePath = `./cache/${moduleType}.json`
  const cache = existsSync(cacheFilePath) ? JSON.parse(readFileSync(cacheFilePath, "utf-8")) : {}

  // Fetch tokens
  const tokenConfigs =
    moduleType === "evm-native" ? [network.nativeCurrency] : (network.tokens[moduleType] ?? [])

  // EVM modules don't require miniMetadata, only substrate modules do
  // Type assertion needed because TypeScript sees union of all module types
  const tokens = await (
    mod.fetchTokens as (params: {
      networkId: string
      tokens: unknown[]
      connector: IChainConnectorEth
      cache: Record<string, unknown>
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
