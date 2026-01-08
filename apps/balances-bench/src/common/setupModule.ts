import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { dirname } from "path"

import { BALANCE_MODULES, MiniMetadata } from "@talismn/balances"
import { ChainConnectorDotStub, IChainConnectorDot } from "@talismn/chain-connectors"
import { DotNetwork, Token, TokenType } from "@talismn/chaindata-provider"
import { fetchBestMetadata } from "@talismn/sapi"
import { decAnyMetadata, unifyMetadata } from "@talismn/scale"

import { DotNetworkConfig } from "./testSubscribeBalances"

export type ModuleSetup = {
  connector: IChainConnectorDot
  miniMetadata: MiniMetadata
  tokens: Token[]
  networkId: string
  specVersion: number
}

/**
 * Sets up a balance module for testing by fetching metadata and tokens
 */
export const setupModule = async (
  network: DotNetworkConfig,
  moduleType: TokenType,
): Promise<ModuleSetup> => {
  const connector = new ChainConnectorDotStub(network as unknown as DotNetwork)

  const { specVersion } = await connector.send<{ specVersion: number }>(
    network.id,
    "state_getRuntimeVersion",
    [],
  )

  const networkId = network.id

  // Load or fetch metadata
  const metadataFilePath = `./cache/metadata/${network.id}-${specVersion}.scale`
  if (!existsSync(metadataFilePath)) {
    const dir = dirname(metadataFilePath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

    const metadataRpc = await fetchBestMetadata(
      (...args) => connector.send(networkId, ...args),
      false,
    )
    writeFileSync(metadataFilePath, metadataRpc)
  }

  const metadataRpc = readFileSync(metadataFilePath, "ascii") as `0x${string}`
  const anyMetadata = decAnyMetadata(metadataRpc)
  unifyMetadata(anyMetadata)

  // Get the module
  const mod = BALANCE_MODULES.find((m) => m.type === moduleType && m.platform === "polkadot")
  if (!mod) {
    throw new Error(`Module ${moduleType} not found`)
  }

  // Get mini metadata
  const miniMetadata = mod.getMiniMetadata({
    networkId,
    specVersion,
    metadataRpc,
    config: network.balancesConfig?.[moduleType],
  })

  // Fetch tokens
  const tokenConfigs =
    moduleType === "substrate-native"
      ? [network.nativeCurrency]
      : (network.tokens[moduleType] ?? [])

  const tokens = await mod.fetchTokens({
    networkId,
    tokens: tokenConfigs as never,
    connector,
    miniMetadata: miniMetadata as never,
    cache: {},
  })

  return {
    connector,
    miniMetadata,
    tokens,
    networkId,
    specVersion,
  }
}
