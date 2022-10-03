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
import { print } from "graphql"

import { addCustomChainRpcs } from "./addCustomChainRpcs"
import { chainsQuery, evmNetworksQuery, graphqlUrl, tokensQuery } from "./graphql"
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
  async getChain(chainId: ChainId): Promise<Chain | null> {
    return (await this.#db.chains.get(chainId)) || null
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
  async getEvmNetwork(evmNetworkId: EvmNetworkId): Promise<EvmNetwork | null> {
    return (await this.#db.evmNetworks.get(evmNetworkId)) || null
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
  async getToken(tokenId: TokenId): Promise<Token | null> {
    return (await this.#db.tokens.get(tokenId)) || null
  }

  async addCustomChain(customChain: CustomChain) {
    if (!("isCustom" in customChain)) return
    this.#db.chains.put(customChain)
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
      const body = await fetch(graphqlUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: print(chainsQuery) }),
      }).then((response) => response.json())

      const chains = addCustomChainRpcs(body?.data?.chains || [])
      if (chains.length <= 0) throw new Error("Ignoring empty chaindata chains response")

      await this.#db.transaction("rw", this.#db.chains, () => {
        this.#db.chains.clear()
        this.#db.chains.bulkPut(chains)
      })
      this.#lastHydratedChainsAt = now

      return true
    } catch (error) {
      // eslint-disable-next-line no-console
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
      const body = await fetch(graphqlUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: print(evmNetworksQuery) }),
      }).then((response) => response.json())

      const evmNetworks = body?.data?.evmNetworks || []
      if (evmNetworks.length <= 0) throw new Error("Ignoring empty chaindata evmNetworks response")

      await this.#db.transaction("rw", this.#db.evmNetworks, () => {
        this.#db.evmNetworks.filter((network) => !("isCustom" in network)).delete()
        this.#db.evmNetworks.bulkPut(evmNetworks)
      })
      this.#lastHydratedEvmNetworksAt = now

      return true
    } catch (error) {
      // eslint-disable-next-line no-console
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
      const body = await fetch(graphqlUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: print(tokensQuery) }),
      }).then((response) => response.json())

      const tokens = parseTokensResponse(body?.data?.tokens || [])
      if (tokens.length <= 0) throw new Error("Ignoring empty chaindata tokens response")

      await this.#db.transaction("rw", this.#db.tokens, () => {
        this.#db.tokens.filter((token) => !("isCustom" in token)).delete()
        this.#db.tokens.bulkPut(tokens)
      })
      this.#lastHydratedTokensAt = now

      return true
    } catch (error) {
      // eslint-disable-next-line no-console
      log.warn(`Failed to hydrate tokens from chaindata`, error)

      return false
    }
  }
}
