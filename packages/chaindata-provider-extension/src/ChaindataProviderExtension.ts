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
import { PromiseExtended, Transaction, TransactionMode } from "dexie"

import { addCustomChainRpcs } from "./addCustomChainRpcs"
import { fetchChains, fetchEvmNetwork, fetchEvmNetworks, fetchToken, fetchTokens } from "./graphql"
import log from "./log"
import { parseTokensResponse } from "./parseTokensResponse"
import { TalismanChaindataDatabase } from "./TalismanChaindataDatabase"

const minimumHydrationInterval = 300_000 // 300_000ms = 300s = 5 minutes

export type ChaindataProviderExtensionOptions = {
  onfinalityApiKey?: string
}

export class ChaindataProviderExtension implements ChaindataProvider {
  #db: TalismanChaindataDatabase
  #lastHydratedChainsAt = 0
  #lastHydratedEvmNetworksAt = 0
  #lastHydratedTokensAt = 0
  #onfinalityApiKey?: string

  constructor(options?: ChaindataProviderExtensionOptions) {
    this.#db = new TalismanChaindataDatabase()
    this.#onfinalityApiKey = options?.onfinalityApiKey ?? undefined
  }

  setOnfinalityApiKey(apiKey: string | undefined) {
    this.#onfinalityApiKey = apiKey
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
    return this.#db.chains.put(customChain)
  }
  async removeCustomChain(chainId: ChainId) {
    return (
      this.#db.chains
        // only affect custom chains
        .filter((chain) => "isCustom" in chain && chain.isCustom === true)
        // only affect the provided chainId
        .filter((chain) => chain.id === chainId)
        // delete the chain (if exists)
        .delete()
    )
  }

  async addCustomEvmNetwork(customEvmNetwork: CustomEvmNetwork) {
    if (!("isCustom" in customEvmNetwork)) return
    return this.#db.evmNetworks.put(customEvmNetwork)
  }
  async removeCustomEvmNetwork(evmNetworkId: EvmNetworkId) {
    if (await this.getIsBuiltInEvmNetwork(evmNetworkId))
      throw new Error("Cannot remove built-in EVM network")

    return this.#db.transaction("rw", [this.#db.evmNetworks, this.#db.tokens], async () => {
      await this.#db.evmNetworks.delete(evmNetworkId)
      await this.#db.tokens.filter((token) => token.evmNetwork?.id === evmNetworkId).delete()
    })
  }
  async resetEvmNetwork(evmNetworkId: EvmNetworkId) {
    const builtInEvmNetwork = await fetchEvmNetwork(evmNetworkId)
    if (!builtInEvmNetwork) throw new Error("Cannot reset non-built-in EVM network")
    const builtInNativeToken = await fetchToken(builtInEvmNetwork.nativeToken.id)
    if (!builtInNativeToken) throw new Error("Failed to lookup native token")

    return this.#db.transaction("rw", this.#db.evmNetworks, this.#db.tokens, async () => {
      // delete network and it's native token
      const networkToDelete = await this.#db.evmNetworks.get(evmNetworkId)
      if (networkToDelete?.nativeToken?.id)
        await this.#db.tokens.delete(networkToDelete.nativeToken.id)
      await this.#db.evmNetworks.delete(evmNetworkId)

      // reprovision them from subsquid data
      await this.#db.tokens.put(builtInNativeToken)
      await this.#db.evmNetworks.put(builtInEvmNetwork)
    })
  }

  async addCustomToken(customToken: Token) {
    if (!("isCustom" in customToken)) return
    return this.#db.tokens.put(customToken)
  }
  async removeCustomToken(tokenId: TokenId) {
    return (
      this.#db.tokens
        // only affect custom tokens
        .filter((token) => "isCustom" in token && (token as any).isCustom === true)
        // only affect the provided token
        .filter((token) => token.id === tokenId)
        // delete the token (if exists)
        .delete()
    )
  }
  removeToken(tokenId: TokenId) {
    return this.#db.tokens.delete(tokenId)
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

      const chains = addCustomChainRpcs(body?.data?.chains || [], this.#onfinalityApiKey)
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

      const evmNetworks: EvmNetwork[] = body?.data?.evmNetworks || []
      if (evmNetworks.length <= 0) throw new Error("Ignoring empty chaindata evmNetworks response")

      await this.#db.transaction("rw", this.#db.evmNetworks, async () => {
        await this.#db.evmNetworks.filter((network) => !("isCustom" in network)).delete()
        // add all except ones matching custom existing ones (user may customize built-in networks)
        const customNetworks = await this.#db.evmNetworks.toArray()
        const newNetworks = evmNetworks.filter((network) =>
          customNetworks.every((existing) => existing.id !== network.id)
        )
        await this.#db.evmNetworks.bulkPut(newNetworks)
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

      await this.#db.transaction("rw", this.#db.tokens, async () => {
        await this.#db.tokens.filter((token) => !("isCustom" in token)).delete()
        // add all except ones matching custom existing ones (user may customize built-in tokens)
        const customTokens = await this.#db.tokens.toArray()
        const newTokens = tokens.filter((token) =>
          customTokens.every((existing) => existing.id !== token.id)
        )
        await this.#db.tokens.bulkPut(newTokens)
      })
      this.#lastHydratedTokensAt = now

      return true
    } catch (error) {
      log.warn(`Failed to hydrate tokens from chaindata`, error)

      return false
    }
  }

  async getIsBuiltInEvmNetwork(evmNetworkId: EvmNetworkId) {
    const evmNetwork = await fetchEvmNetwork(evmNetworkId)
    return !!evmNetwork
  }

  transaction<U>(
    mode: TransactionMode,
    tables: string[],
    scope: (trans: Transaction) => PromiseLike<U> | U
  ): PromiseExtended<U> {
    return this.#db.transaction(mode, tables, scope)
  }
}
