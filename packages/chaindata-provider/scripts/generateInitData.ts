import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

import type {
  EvmErc20ModuleConfig,
  EvmUniswapV2ModuleConfig,
  MiniMetadata,
} from "@talismn/balances"
import { deriveMiniMetadataId } from "@talismn/balances"

import type { Chain, EvmNetwork, Token } from "../src/types"
import { fetchChains, fetchEvmNetworks, fetchMiniMetadatas, fetchSubstrateTokens } from "../src/net"

// These allowlists are used to reduce the size of the initdata.
// We only keep a few chains/networks, and expect the wallet to fetch the rest of them
// when it first connects to the internet.
const CHAINS_ALLOWLIST = [
  "polkadot",
  "polkadot-asset-hub",
  "polkadot-bridge-hub",
  "kusama",
  "kusama-asset-hub",
  "kusama-bridge-hub",
]
const EVM_NETWORKS_ALLOWLIST = ["1"]
const ETHEREUM_MAINNET_ERC20_ALLOWLIST = [
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // usdc
  "0x6b175474e89094c44da98b954eedeac495271d0f", // dai
]
const BALANCE_MODULE_ALLOWLIST = [
  "substrate-assets",
  "substrate-native",
  "substrate-psp22",
  "substrate-tokens",
]

async function generateInitData() {
  const initDataFilter = new InitDataFilter()

  fs.writeFileSync(
    path.resolve(__dirname, "../src/init/chains.ts"),
    `export const chains = ${JSON.stringify(
      initDataFilter.filterChains(await fetchChains()),
      null,
      2
    )}`
  )
  fs.writeFileSync(
    path.resolve(__dirname, "../src/init/evm-networks.ts"),
    `export const evmNetworks = ${JSON.stringify(
      initDataFilter.filterEvmNetworks(await fetchEvmNetworks()),
      null,
      2
    )}`
  )
  fs.writeFileSync(
    path.resolve(__dirname, "../src/init/tokens.ts"),
    `export const tokens = ${JSON.stringify(
      initDataFilter.filterTokens(await fetchSubstrateTokens()),
      null,
      2
    )}`
  )
  fs.writeFileSync(
    path.resolve(__dirname, "../src/init/mini-metadatas.ts"),
    `export const miniMetadatas = ${JSON.stringify(
      initDataFilter.filterMiniMetadatas(await fetchMiniMetadatas()),
      null,
      2
    )}`
  )

  execSync(`prettier --write '${path.resolve(__dirname, "../src/init")}'`, { stdio: "inherit" })
}

/**
 * As part of our migration to Manifest V3, we found that we can no longer
 * dynamically `await import` code in the background script (because it now runs in a ServerWorker scope).
 *
 * Because of this, it was necessary for us to trim down the size of this initdata to prevent it from
 * bloating the size of the background script bundle.
 *
 * It is necessary to run the filters in order: Chains, EvmNetworks, Tokens, MiniMetadatas.
 *
 * This is because the Chains and EvmNetworks filters also keep track of which tokens are available
 * in the chains and networks that are kept.
 *
 * The tokens filter then uses this list to decide which tokens it should keep.
 *
 * A similar process is used by the miniMetadatas filter to determine which MiniMetadatas to keep.
 */
class InitDataFilter {
  #foundTokenIds = new Set<string>()
  #wantedMiniMetadataIds = new Set<string>()

  filterChains = (chains: Chain[]) => {
    chains = chains.filter((chain) => CHAINS_ALLOWLIST.includes(chain.id))

    this.#foundTokenIds = new Set(
      chains.flatMap(({ nativeToken, tokens }) => [
        ...(nativeToken?.id ? [nativeToken.id] : []),
        ...(tokens ?? []).map(({ id }) => id),
      ])
    )

    this.#wantedMiniMetadataIds = new Set(
      [...this.wantedIdsByChain(chains).values()].flatMap((ids) => ids)
    )

    return chains
  }

  filterEvmNetworks = (evmNetworks: EvmNetwork[]) => {
    evmNetworks = evmNetworks.filter((evmNetwork) => EVM_NETWORKS_ALLOWLIST.includes(evmNetwork.id))

    const ethereum = evmNetworks.find(({ id }) => id === "1")
    const erc20Config = ethereum?.balancesConfig?.find?.((c) => c.moduleType === "evm-erc20")
      ?.moduleConfig as EvmErc20ModuleConfig | undefined
    if (erc20Config?.tokens)
      erc20Config.tokens = erc20Config.tokens.filter(
        (token) =>
          token.contractAddress &&
          ETHEREUM_MAINNET_ERC20_ALLOWLIST.includes(token.contractAddress.toLowerCase())
      )

    const univ2Config = ethereum?.balancesConfig?.find?.((c) => c.moduleType === "evm-uniswapv2")
      ?.moduleConfig as EvmUniswapV2ModuleConfig | undefined
    if (univ2Config?.pools) univ2Config.pools = []

    return evmNetworks
  }

  filterTokens = (tokens: Token[]) => tokens.filter((token) => this.#foundTokenIds.has(token.id))

  filterMiniMetadatas = (miniMetadatas: MiniMetadata[]) =>
    miniMetadatas.filter((miniMetadata) => this.#wantedMiniMetadataIds.has(miniMetadata.id))

  private wantedIdsByChain = (chains: Chain[]) =>
    new Map<string, string[]>(
      chains.flatMap(({ id: chainId, specName, specVersion, balancesConfig }) => {
        if (specName === null) return []
        if (specVersion === null) return []

        return [
          [
            chainId,
            BALANCE_MODULE_ALLOWLIST.map((source) =>
              deriveMiniMetadataId({
                source,
                chainId: chainId,
                specName: specName,
                specVersion: specVersion,
                balancesConfig: JSON.stringify(
                  (balancesConfig ?? []).find(({ moduleType }) => moduleType === source)
                    ?.moduleConfig ?? {}
                ),
              })
            ),
          ],
        ]
      })
    )
}

// Use this command to run this file:
//
// ```
// `pnpm chore:generate-init-data`
// ```
generateInitData()
