import {
  Chain,
  ChainId,
  ChainList,
  ChaindataProvider,
  CustomChain,
  CustomEvmNetwork,
  EvmNetwork,
  EvmNetworkId,
  EvmNetworkList,
  Token,
  TokenId,
  TokenList,
} from "@talismn/chaindata-provider"

import { addCustomChainRpcs } from "./addCustomChainRpcs"
import { fetchChains, fetchEvmNetworks, fetchTokens } from "./graphql"
import log from "./log"
import { parseTokensResponse } from "./parseTokensResponse"
import { TalismanChaindataDatabase } from "./TalismanChaindataDatabase"

const minimumHydrationInterval = 300_000 // 300_000ms = 300s = 5 minutes

export class ChaindataProviderExtension implements ChaindataProvider {
  #db: TalismanChaindataDatabase
  #lastHydratedChainsAt = 0
  #lastHydratedEvmNetworksAt = 0
  #lastHydratedTokensAt = 0

  constructor() {
    this.#db = new TalismanChaindataDatabase()
  }

  async chainIds(): Promise<ChainId[]> {
    return await this.#db.chains.toCollection().primaryKeys()
  }
  async chains(): Promise<ChainList> {
    return (await this.#db.chains.toArray()).reduce(
      (list, chain) => ({ ...list, [chain.id]: chain }),
      {}
    )
  }
  async getChain(chainIdOrQuery: ChainId | Partial<Chain>): Promise<Chain | CustomChain | null> {
    const [chainId, chainQuery] =
      typeof chainIdOrQuery === "string"
        ? // chainId (ChainId)
          [chainIdOrQuery, undefined]
        : // chainQuery (Partial<Chain>)
          [undefined, chainIdOrQuery]

    return chainId !== undefined
      ? (await this.#db.chains.get(chainId)) || null
      : (await this.#db.chains.get(chainQuery)) || null
  }

  async evmNetworkIds(): Promise<EvmNetworkId[]> {
    return await this.#db.evmNetworks.toCollection().primaryKeys()
  }
  async evmNetworks(): Promise<EvmNetworkList> {
    return (await this.#db.evmNetworks.toArray()).reduce(
      (list, evmNetwork) => ({ ...list, [evmNetwork.id]: evmNetwork }),
      {}
    )
  }
  async getEvmNetwork(
    evmNetworkIdOrQuery: EvmNetworkId | Partial<EvmNetwork>
  ): Promise<EvmNetwork | CustomEvmNetwork | null> {
    const [evmNetworkId, evmNetworkQuery] =
      typeof evmNetworkIdOrQuery === "string"
        ? // evmNetworkId (EvmNetworkId)
          [evmNetworkIdOrQuery, undefined]
        : // evmNetworkQuery (Partial<EvmNetwork>)
          [undefined, evmNetworkIdOrQuery]

    return evmNetworkId !== undefined
      ? (await this.#db.evmNetworks.get(evmNetworkId)) || null
      : (await this.#db.evmNetworks.get(evmNetworkQuery)) || null
  }

  async tokenIds(): Promise<TokenId[]> {
    return await this.#db.tokens.toCollection().primaryKeys()
  }
  async tokens(): Promise<TokenList> {
    return (await this.#db.tokens.toArray()).reduce(
      (list, token) => ({ ...list, [token.id]: token }),
      {}
    )
  }
  async getToken(tokenIdOrQuery: TokenId | Partial<Token>): Promise<Token | null> {
    const [tokenId, tokenQuery] =
      typeof tokenIdOrQuery === "string"
        ? // tokenId (TokenId)
          [tokenIdOrQuery, undefined]
        : // tokenQuery (Partial<Token>)
          [undefined, tokenIdOrQuery]

    return tokenId !== undefined
      ? (await this.#db.tokens.get(tokenId)) || null
      : (await this.#db.tokens.get(tokenQuery)) || null
  }

  async addCustomChain(customChain: CustomChain) {
    if (!("isCustom" in customChain)) return
    this.#db.chains.put(customChain)
  }
  async removeCustomChain(chainId: ChainId) {
    this.#db.chains
      // only affect custom chains
      .filter((chain) => "isCustom" in chain && chain.isCustom === true)
      // only affect the provided chainId
      .filter((chain) => chain.id === chainId)
      // delete the chain (if exists)
      .delete()
  }
  async clearCustomChains() {
    this.#db.transaction("rw", this.#db.chains, () => {
      this.#db.chains.filter((chain) => "isCustom" in chain && chain.isCustom === true).delete()
    })
  }

  async addCustomEvmNetwork(customEvmNetwork: CustomEvmNetwork) {
    if (!("isCustom" in customEvmNetwork)) return
    this.#db.evmNetworks.put(customEvmNetwork)
  }
  async removeCustomEvmNetwork(evmNetworkId: EvmNetworkId) {
    this.#db.evmNetworks
      // only affect custom evmNetworks
      .filter((network) => "isCustom" in network && network.isCustom === true)
      // only affect the provided evmNetworkId
      .filter((network) => network.id === evmNetworkId)
      // delete the evmNetwork (if exists)
      .delete()
  }
  async clearCustomEvmNetworks() {
    this.#db.transaction("rw", this.#db.evmNetworks, () => {
      this.#db.evmNetworks
        .filter((network) => "isCustom" in network && network.isCustom === true)
        .delete()
    })
  }

  async addCustomToken(customToken: Token) {
    if (!("isCustom" in customToken)) return
    this.#db.tokens.put(customToken)
  }
  async removeCustomToken(tokenId: TokenId) {
    this.#db.tokens
      // only affect custom tokens
      .filter((token) => "isCustom" in token && (token as any).isCustom === true)
      // only affect the provided token
      .filter((token) => token.id === tokenId)
      // delete the token (if exists)
      .delete()
  }
  async clearCustomTokens() {
    await this.#db.transaction("rw", this.#db.tokens, () => {
      this.#db.tokens
        .filter((token) => "isCustom" in token && (token as any).isCustom === true)
        .delete()
    })
  }

  /**
   * Hydrate the db with the latest chaindata from subsquid.
   *
   * @returns A promise which resolves to true if any db table has been hydrated, or false if all hydration has been skipped.
   */
  async hydrate(): Promise<boolean> {
    return (
      (
        await Promise.all([
          // call inner hydration methods
          this.hydrateChains(),
          this.hydrateEvmNetworks(),
          this.hydrateTokens(),
        ])
      )
        // return true if any hydration occurred
        .some(Boolean)
    )
  }

  /**
   * Hydrate the db with the latest chains from subsquid.
   * Hydration is skipped when the last successful hydration was less than minimumHydrationInterval ms ago.
   *
   * @returns A promise which resolves to true if the db has been hydrated, or false if the hydration was skipped.
   */
  async hydrateChains() {
    const now = Date.now()
    if (now - this.#lastHydratedChainsAt < minimumHydrationInterval) return false

    try {
      const body = await fetchChains()

      const chains = addCustomChainRpcs(body?.data?.chains || [])
      if (chains.length <= 0) throw new Error("Ignoring empty chaindata chains response")

      await this.#db.transaction("rw", this.#db.chains, () => {
        this.#db.chains.filter((chain) => !("isCustom" in chain)).delete()
        this.#db.chains.bulkPut(chains)
      })
      this.#lastHydratedChainsAt = now

      return true
    } catch (error) {
      log.warn(`Failed to hydrate chains from chaindata`, error)

      return false
    }
  }

  /**
   * Hydrate the db with the latest evmNetworks from subsquid.
   * Hydration is skipped when the last successful hydration was less than minimumHydrationInterval ms ago.
   *
   * @returns A promise which resolves to true if the db has been hydrated, or false if the hydration was skipped.
   */
  async hydrateEvmNetworks() {
    const now = Date.now()
    if (now - this.#lastHydratedEvmNetworksAt < minimumHydrationInterval) return false

    try {
      const body = await fetchEvmNetworks()

      const evmNetworks = body?.data?.evmNetworks || []
      if (evmNetworks.length <= 0) throw new Error("Ignoring empty chaindata evmNetworks response")

      await this.#db.transaction("rw", this.#db.evmNetworks, () => {
        this.#db.evmNetworks.filter((network) => !("isCustom" in network)).delete()
        this.#db.evmNetworks.bulkPut(evmNetworks)
      })
      this.#lastHydratedEvmNetworksAt = now

      return true
    } catch (error) {
      log.warn(`Failed to hydrate evmNetworks from chaindata`, error)

      return false
    }
  }

  /**
   * Hydrate the db with the latest tokens from subsquid.
   * Hydration is skipped when the last successful hydration was less than minimumHydrationInterval ms ago.
   *
   * @returns A promise which resolves to true if the db has been hydrated, or false if the hydration was skipped.
   */
  async hydrateTokens() {
    const now = Date.now()
    if (now - this.#lastHydratedTokensAt < minimumHydrationInterval) return false

    try {
      const body = await fetchTokens()

      const tokens = parseTokensResponse(body?.data?.tokens || [])
      if (tokens.length <= 0) throw new Error("Ignoring empty chaindata tokens response")

      await this.#db.transaction("rw", this.#db.tokens, () => {
        this.#db.tokens.filter((token) => !("isCustom" in token)).delete()
        this.#db.tokens.bulkPut(tokens)
      })
      this.#lastHydratedTokensAt = now

      return true
    } catch (error) {
      log.warn(`Failed to hydrate tokens from chaindata`, error)

      return false
    }
  }
}
