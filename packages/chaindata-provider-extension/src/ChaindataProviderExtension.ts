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
    try {
      return await this.#db.chains.toCollection().primaryKeys()
    } catch (cause) {
      throw new Error("Failed to get chainIds", { cause })
    }
  }
  async chains(): Promise<ChainList> {
    try {
      const chains = await this.#db.chains.toArray()
      return Object.fromEntries(chains.map((chain) => [chain.id, chain]))
    } catch (cause) {
      throw new Error("Failed to get chains", { cause })
    }
  }
  async chainsArray() {
    try {
      return await this.#db.chains.toArray()
    } catch (cause) {
      throw new Error("Failed to get chains", { cause })
    }
  }
  async getChain(chainIdOrQuery: ChainId | Partial<Chain>): Promise<Chain | CustomChain | null> {
    const [chainId, chainQuery] =
      typeof chainIdOrQuery === "string"
        ? // chainId (ChainId)
          [chainIdOrQuery, undefined]
        : // chainQuery (Partial<Chain>)
          [undefined, chainIdOrQuery]

    try {
      return chainId !== undefined
        ? (await this.#db.chains.get(chainId)) || null
        : (await this.#db.chains.get(chainQuery)) || null
    } catch (cause) {
      throw new Error("Failed to get chain", { cause })
    }
  }

  async evmNetworkIds(): Promise<EvmNetworkId[]> {
    try {
      return await this.#db.evmNetworks.toCollection().primaryKeys()
    } catch (cause) {
      throw new Error("Failed to get evmNetworkIds", { cause })
    }
  }
  async evmNetworks(): Promise<EvmNetworkList> {
    try {
      const evmNetworks = await this.#db.evmNetworks.toArray()
      return Object.fromEntries(evmNetworks.map((evmNetwork) => [evmNetwork.id, evmNetwork]))
    } catch (cause) {
      throw new Error("Failed to get evmNetworks", { cause })
    }
  }
  async evmNetworksArray() {
    try {
      return await this.#db.evmNetworks.toArray()
    } catch (cause) {
      throw new Error("Failed to get evmNetworks", { cause })
    }
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

    try {
      return evmNetworkId !== undefined
        ? (await this.#db.evmNetworks.get(evmNetworkId)) || null
        : (await this.#db.evmNetworks.get(evmNetworkQuery)) || null
    } catch (cause) {
      throw new Error("Failed to get evmNetwork", { cause })
    }
  }

  async tokenIds(): Promise<TokenId[]> {
    try {
      return await this.#db.tokens.toCollection().primaryKeys()
    } catch (cause) {
      throw new Error("Failed to get tokenIds", { cause })
    }
  }
  async tokens(): Promise<TokenList> {
    try {
      const tokens = await this.#db.tokens.toArray()
      return Object.fromEntries(tokens.map((token) => [token.id, token]))
    } catch (cause) {
      throw new Error("Failed to get tokens", { cause })
    }
  }
  async tokensArray() {
    try {
      return await this.#db.tokens.toArray()
    } catch (cause) {
      throw new Error("Failed to get tokens", { cause })
    }
  }
  async getToken(tokenIdOrQuery: TokenId | Partial<Token>): Promise<Token | null> {
    const [tokenId, tokenQuery] =
      typeof tokenIdOrQuery === "string"
        ? // tokenId (TokenId)
          [tokenIdOrQuery, undefined]
        : // tokenQuery (Partial<Token>)
          [undefined, tokenIdOrQuery]

    try {
      return tokenId !== undefined
        ? (await this.#db.tokens.get(tokenId)) || null
        : (await this.#db.tokens.get(tokenQuery)) || null
    } catch (cause) {
      throw new Error("Failed to get token", { cause })
    }
  }

  async addCustomChain(customChain: CustomChain) {
    try {
      if (!("isCustom" in customChain)) return
      return this.#db.chains.put(customChain)
    } catch (cause) {
      throw new Error("Failed to add custom chain", { cause })
    }
  }
  async removeCustomChain(chainId: ChainId) {
    try {
      return (
        this.#db.chains
          // only affect custom chains
          .filter((chain) => "isCustom" in chain && chain.isCustom === true)
          // only affect the provided chainId
          .filter((chain) => chain.id === chainId)
          // delete the chain (if exists)
          .delete()
      )
    } catch (cause) {
      throw new Error("Failed to remove custom chain", { cause })
    }
  }

  async addCustomEvmNetwork(customEvmNetwork: CustomEvmNetwork) {
    try {
      if (!("isCustom" in customEvmNetwork)) return
      return this.#db.evmNetworks.put(customEvmNetwork)
    } catch (cause) {
      throw new Error("Failed to add custom evm network", { cause })
    }
  }
  async removeCustomEvmNetwork(evmNetworkId: EvmNetworkId) {
    if (await this.getIsBuiltInEvmNetwork(evmNetworkId))
      throw new Error("Cannot remove built-in EVM network")

    try {
      return this.#db.transaction("rw", [this.#db.evmNetworks, this.#db.tokens], async () => {
        await this.#db.evmNetworks.delete(evmNetworkId)
        await this.#db.tokens.filter((token) => token.evmNetwork?.id === evmNetworkId).delete()
      })
    } catch (cause) {
      throw new Error("Failed to remove custom evm network", { cause })
    }
  }
  async resetEvmNetwork(evmNetworkId: EvmNetworkId) {
    const builtInEvmNetwork = await fetchEvmNetwork(evmNetworkId)
    if (!builtInEvmNetwork) throw new Error("Cannot reset non-built-in EVM network")
    const builtInNativeToken = await fetchToken(builtInEvmNetwork.nativeToken.id)
    if (!builtInNativeToken) throw new Error("Failed to lookup native token")

    try {
      return await this.#db.transaction("rw", this.#db.evmNetworks, this.#db.tokens, async () => {
        // delete network and it's native token
        const networkToDelete = await this.#db.evmNetworks.get(evmNetworkId)
        if (networkToDelete?.nativeToken?.id)
          await this.#db.tokens.delete(networkToDelete.nativeToken.id)
        await this.#db.evmNetworks.delete(evmNetworkId)

        // reprovision them from subsquid data
        await this.#db.tokens.put(builtInNativeToken)
        await this.#db.evmNetworks.put(builtInEvmNetwork)
      })
    } catch (cause) {
      throw new Error("Failed to reset evm network", { cause })
    }
  }

  async addCustomToken(customToken: Token) {
    try {
      if (!("isCustom" in customToken)) return
      return this.#db.tokens.put(customToken)
    } catch (cause) {
      throw new Error("Failed to add custom token", { cause })
    }
  }
  async removeCustomToken(tokenId: TokenId) {
    try {
      return (
        this.#db.tokens
          // only affect custom tokens
          .filter((token) => "isCustom" in token && (token as any).isCustom === true)
          // only affect the provided token
          .filter((token) => token.id === tokenId)
          // delete the token (if exists)
          .delete()
      )
    } catch (cause) {
      throw new Error("Failed to remove custom token", { cause })
    }
  }
  async removeToken(tokenId: TokenId) {
    try {
      return await this.#db.tokens.delete(tokenId)
    } catch (cause) {
      throw new Error("Failed to remove token", { cause })
    }
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
