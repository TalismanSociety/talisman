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
  githubTokenLogoUrl,
  githubUnknownTokenLogoUrl,
} from "@talismn/chaindata-provider"
import { PromiseExtended, Transaction, TransactionMode, liveQuery } from "dexie"
import { Observable, from } from "rxjs"

import { addCustomChainRpcs } from "./addCustomChainRpcs"
import { fetchInitChains, fetchInitEvmNetworks } from "./init"
import log from "./log"
import { fetchChain, fetchChains, fetchEvmNetwork, fetchEvmNetworks } from "./net"
import { isITokenPartial, isToken } from "./parseTokensResponse"
import { TalismanChaindataDatabase } from "./TalismanChaindataDatabase"

// removes the need to reference @talismn/balances in this package. should we ?
const getNativeTokenId = (chainId: EvmNetworkId, moduleType: string, tokenSymbol: string) =>
  `${chainId}-${moduleType}-${tokenSymbol}`.toLowerCase().replace(/ /g, "-")

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

  subscribeCustomChains() {
    return from(
      liveQuery(() =>
        this.#db.chains
          .filter((chain): chain is CustomChain => "isCustom" in chain && chain.isCustom)
          // @ts-expect-error Dexie can't do type assertion on filter
          .toArray<CustomChain[]>((chains) => chains)
      )
    )
  }

  setCustomChains(chains: CustomChain[]) {
    return this.#db.transaction("rw", this.#db.chains, async () => {
      const keys = await this.#db.chains
        .filter((chains) => "isCustom" in chains && Boolean(chains.isCustom))
        .primaryKeys()

      await this.#db.chains.bulkDelete(keys)
      await this.#db.chains.bulkPut(chains.filter((network) => network.isCustom))
    })
  }

  async resetChain(chainId: ChainId) {
    const builtInChain = await fetchChain(chainId)
    if (!builtInChain) throw new Error("Cannot reset non-built-in chain")
    if (!builtInChain.nativeToken?.id)
      throw new Error("Failed to lookup native token (no token exists for chain)")
    const builtInNativeToken = null // await fetchToken(builtInChain.nativeToken.id)
    if (!isITokenPartial(builtInNativeToken)) throw new Error("Failed to lookup native token")
    if (!isToken(builtInNativeToken))
      throw new Error("Failed to lookup native token (isToken test failed)")

    try {
      return await this.#db.transaction("rw", this.#db.chains, this.#db.tokens, async () => {
        // delete chain and its native token
        const chainToDelete = await this.#db.chains.get(chainId)
        if (chainToDelete?.nativeToken?.id)
          await this.#db.tokens.delete(chainToDelete.nativeToken.id)
        await this.#db.chains.delete(chainId)

        // reprovision them from subsquid data
        await this.#db.chains.put(builtInChain)
        await this.#db.tokens.put(builtInNativeToken)
      })
    } catch (cause) {
      throw new Error("Failed to reset chain", { cause })
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

  subscribeCustomEvmNetworks() {
    return from(
      liveQuery(() =>
        this.#db.evmNetworks
          .filter(
            (network): network is CustomEvmNetwork => "isCustom" in network && network.isCustom
          )
          // @ts-expect-error Dexie can't do type assertion on filter
          .toArray<CustomEvmNetwork[]>((networks) => networks)
      )
    )
  }

  setCustomEvmNetworks(networks: CustomEvmNetwork[]) {
    return this.#db.transaction("rw", this.#db.evmNetworks, async () => {
      const keys = await this.#db.evmNetworks
        .filter((network) => "isCustom" in network && Boolean(network.isCustom))
        .primaryKeys()

      await this.#db.evmNetworks.bulkDelete(keys)
      await this.#db.evmNetworks.bulkPut(networks.filter((network) => network.isCustom))
    })
  }

  async resetEvmNetwork(evmNetworkId: EvmNetworkId) {
    const builtInEvmNetwork = await fetchEvmNetwork(evmNetworkId)
    if (!builtInEvmNetwork) throw new Error("Cannot reset non-built-in EVM network")
    if (!builtInEvmNetwork.nativeToken?.id)
      throw new Error("Failed to lookup native token (no token exists for network)")
    const builtInNativeToken = null // await fetchToken(builtInEvmNetwork.nativeToken.id)
    if (!isITokenPartial(builtInNativeToken)) throw new Error("Failed to lookup native token")
    if (!isToken(builtInNativeToken))
      throw new Error("Failed to lookup native token (isToken test failed)")

    try {
      return await this.#db.transaction("rw", this.#db.evmNetworks, this.#db.tokens, async () => {
        // delete network and its native token
        const networkToDelete = await this.#db.evmNetworks.get(evmNetworkId)
        if (networkToDelete?.nativeToken?.id)
          await this.#db.tokens.delete(networkToDelete.nativeToken.id)
        await this.#db.evmNetworks.delete(evmNetworkId)

        // reprovision them from subsquid data
        await this.#db.evmNetworks.put(builtInEvmNetwork)
        await this.#db.tokens.put(builtInNativeToken)
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
          .filter((token) => "isCustom" in token && token.isCustom === true)
          // only affect the provided token
          .filter((token) => token.id === tokenId)
          // delete the token (if exists)
          .delete()
      )
    } catch (cause) {
      throw new Error("Failed to remove custom token", { cause })
    }
  }

  // Need to explicitly type the return type
  // else TypeScript will resolve it to `IToken` instead
  subscribeCustomTokens(): Observable<Token[]> {
    return from(
      liveQuery(() =>
        this.#db.tokens
          .filter((token): token is Token => "isCustom" in token)
          // Dexie can't do type assertion on filter
          .toArray<Token[]>((tokens) => tokens)
      )
    )
  }

  setCustomTokens(tokens: Token[]) {
    return this.#db.transaction("rw", this.#db.tokens, async () => {
      const keys = await this.#db.tokens
        .filter((token) => "isCustom" in token && Boolean(token.isCustom))
        .primaryKeys()

      await this.#db.tokens.bulkDelete(keys)
      await this.#db.tokens.bulkPut(tokens.filter((token) => "isCustom" in token && token.isCustom))
    })
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

    const dbHasChains = (await this.#db.chains.count()) > 0

    try {
      try {
        var chains = addCustomChainRpcs(await fetchChains(), this.#onfinalityApiKey) // eslint-disable-line no-var
        if (chains.length <= 0) throw new Error("Ignoring empty chaindata chains response")
      } catch (error) {
        if (dbHasChains) throw error

        // On first start-up (db is empty), if we fail to fetch chains then we should
        // initialize the DB with the list of chains inside our init/chains.json file.
        // This data will represent a relatively recent copy of what's in the squid,
        // which will be better for our users than to have nothing at all.
        var chains = addCustomChainRpcs(await fetchInitChains(), this.#onfinalityApiKey) // eslint-disable-line no-var
      }

      // TODO remove
      log.debug("hydrateChains", chains)

      // TODO check if alec is this the right way to set native token
      for (const chain of chains) {
        const nativeTokenModule = chain.balancesConfig.find(
          (c) => c.moduleType === "substrate-native"
        )
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const symbol = (nativeTokenModule?.moduleConfig as any)?.symbol
        chain.nativeToken = { id: getNativeTokenId(chain.id, "substrate-native", symbol) }
      }

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

    const dbHasEvmNetworks = (await this.#db.evmNetworks.count()) > 0

    try {
      try {
        var evmNetworks: EvmNetwork[] = await fetchEvmNetworks() // eslint-disable-line no-var
        if (evmNetworks.length <= 0)
          throw new Error("Ignoring empty chaindata evmNetworks response")
      } catch (error) {
        if (dbHasEvmNetworks) throw error

        // On first start-up (db is empty), if we fail to fetch evmNetworks then we should
        // initialize the DB with the list of evmNetworks inside our init/evm-networks.json file.
        // This data will represent a relatively recent copy of what's in the squid,
        // which will be better for our users than to have nothing at all.
        var evmNetworks: EvmNetwork[] = await fetchInitEvmNetworks() // eslint-disable-line no-var
      }

      // TODO check if alec is this the right way to set native token
      // set native token
      for (const evmNetwork of evmNetworks) {
        const nativeTokenModule = evmNetwork.balancesConfig.find(
          (c) => c.moduleType === "evm-native"
        )
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const symbol = (nativeTokenModule?.moduleConfig as any)?.symbol
        evmNetwork.nativeToken = { id: getNativeTokenId(evmNetwork.id, "evm-native", symbol) }
      }

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

  async updateChainTokens(
    chainId: ChainId,
    source: string,
    newTokens: Token[],
    availableTokenLogoFilenames: string[]
  ) {
    // TODO: Test logos and fall back to unknown token logo url
    // (Maybe put the test into each balance module itself)

    const existingChainTokens = await this.#db.tokens
      .filter((token) => token.chain?.id === chainId && token.type === source)
      .toArray()

    newTokens.forEach((token) => {
      if (token.logo) return

      const symbolLogo = token.symbol.toLowerCase().replace(/ /g, "_")
      if (availableTokenLogoFilenames.includes(`${symbolLogo}.svg`)) {
        return (token.logo = githubTokenLogoUrl(symbolLogo))
      }

      // TODO: Use coingeckoId logo if exists

      return (token.logo = githubUnknownTokenLogoUrl)
    })

    const notCustomTokenIds = existingChainTokens
      .filter((token) => !("isCustom" in token && token.isCustom))
      .map((token) => token.id)
    const customTokenIds = existingChainTokens
      .filter((token) => "isCustom" in token && token.isCustom)
      .map((token) => token.id)

    await this.#db.transaction("rw", this.#db.tokens, async () => {
      await this.#db.tokens.bulkDelete(notCustomTokenIds)
      await this.#db.tokens.bulkPut(newTokens.filter((token) => !customTokenIds.includes(token.id)))
    })
  }

  async updateEvmNetworkTokens(newTokens: Token[]) {
    const existingEvmNetworkTokens = await this.#db.tokens
      .filter((t) => t.type.startsWith("evm-"))
      .toArray()

    const isCustomToken = (token: Token) => "isCustom" in token && token.isCustom

    const notCustomTokenIds: string[] = []
    const customTokenIds: string[] = []

    for (const token of existingEvmNetworkTokens) {
      if (isCustomToken(token)) customTokenIds.push(token.id)
      else notCustomTokenIds.push(token.id)
    }

    const tokensToUpdate = newTokens.filter((token) => !customTokenIds.includes(token.id))

    this.#db.transaction("rw", this.#db.tokens, async () => {
      // delete all existing non custom tokens
      await this.#db.tokens.bulkDelete(notCustomTokenIds)

      // force update on all non custom tokens
      await this.#db.tokens.bulkPut(tokensToUpdate)
    })
  }

  /**
   * Hydrate the db with the latest tokens from subsquid.
   * Hydration is skipped when the last successful hydration was less than minimumHydrationInterval ms ago.
   *
   * @returns A promise which resolves to true if the db has been hydrated, or false if the hydration was skipped.
   */
  async hydrateTokens() {
    // const now = Date.now()
    // if (now - this.#lastHydratedTokensAt < minimumHydrationInterval) return false
    //
    // const dbHasTokens = (await this.#db.tokens.count()) > 0
    //
    // try {
    //   try {
    //     var tokens = parseTokensResponse(await fetchTokens()) // eslint-disable-line no-var
    //     if (tokens.length <= 0) throw new Error("Ignoring empty chaindata tokens response")
    //   } catch (error) {
    //     if (dbHasTokens) throw error
    //
    //     // On first start-up (db is empty), if we fail to fetch tokens then we should
    //     // initialize the DB with the list of tokens inside our init/tokens.json file.
    //     // This data will represent a relatively recent copy of what's in the squid,
    //     // which will be better for our users than to have nothing at all.
    //     var tokens = parseTokensResponse(await fetchInitTokens()) // eslint-disable-line no-var
    //   }
    //
    //   await this.#db.transaction("rw", this.#db.tokens, async () => {
    //     await this.#db.tokens.filter((token) => !("isCustom" in token)).delete()
    //     // add all except ones matching custom existing ones (user may customize built-in tokens)
    //     const customTokens = await this.#db.tokens.toArray()
    //     const newTokens = tokens.filter((token) =>
    //       customTokens.every((existing) => existing.id !== token.id)
    //     )
    //     await this.#db.tokens.bulkPut(newTokens)
    //   })
    //   this.#lastHydratedTokensAt = now
    //
    //   return true
    // } catch (error) {
    //   log.warn(`Failed to hydrate tokens from chaindata`, error)
    //
    //   return false
    // }
  }

  async getIsBuiltInChain(chainId: ChainId) {
    const chain = await fetchChain(chainId)
    return !!chain
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
