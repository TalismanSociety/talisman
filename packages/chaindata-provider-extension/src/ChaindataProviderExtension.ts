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
  IToken,
  Token,
  TokenId,
  TokenList,
  githubTokenLogoUrl,
  githubUnknownTokenLogoUrl,
} from "@talismn/chaindata-provider"
import { PromiseExtended, Transaction, TransactionMode, liveQuery } from "dexie"
import { Observable, ReplaySubject, firstValueFrom, map } from "rxjs"

import { addCustomChainRpcs } from "./addCustomChainRpcs"
import { fetchInitChains, fetchInitEvmNetworks, fetchInitTokens } from "./init"
import log from "./log"
import {
  fetchChain,
  fetchChains,
  fetchEvmNetwork,
  fetchEvmNetworks,
  fetchToken,
  fetchTokens,
} from "./net"
import { isITokenPartial, isToken, parseTokensResponse } from "./parseTokensResponse"
import { TalismanChaindataDatabase } from "./TalismanChaindataDatabase"

// removes the need to reference @talismn/balances in this package. should we ?
const getNativeTokenId = (chainId: EvmNetworkId, moduleType: string) =>
  `${chainId}-${moduleType}`.toLowerCase().replace(/ /g, "-")

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

  #evmNetworksSubject = new ReplaySubject<(EvmNetwork | CustomEvmNetwork)[]>(1)
  #chainsSubject = new ReplaySubject<(Chain | CustomChain)[]>(1)
  #tokensSubject = new ReplaySubject<Token[]>(1)

  constructor(options?: ChaindataProviderExtensionOptions) {
    this.#db = new TalismanChaindataDatabase()
    this.#onfinalityApiKey = options?.onfinalityApiKey ?? undefined

    liveQuery(() => this.#db.tokens.toArray()).subscribe((v) => this.#tokensSubject.next(v))
    liveQuery(() => this.#db.chains.toArray()).subscribe((v) => this.#chainsSubject.next(v))
    liveQuery(() => this.#db.evmNetworks.toArray()).subscribe((v) =>
      this.#evmNetworksSubject.next(v)
    )
  }

  get chainsArrayObservable() {
    return this.#chainsSubject
  }

  get chainsIdsObservable() {
    return this.#chainsSubject.pipe(map((chains) => chains.map(({ id }) => id) as ChainId[]))
  }

  get chainsListObservable() {
    return this.#chainsSubject.pipe(
      map((chains) => Object.fromEntries(chains.map((chains) => [chains.id, chains])) as ChainList)
    )
  }

  get chainsByGenesisHashObservable() {
    return this.#chainsSubject.pipe(
      map(
        (chains) =>
          Object.fromEntries(chains.map((chains) => [chains.genesisHash, chains])) as ChainList
      )
    )
  }

  get evmNetworksArrayObservable() {
    return this.#evmNetworksSubject
  }

  get evmNetworksIdsObservable() {
    return this.#evmNetworksSubject.pipe(
      map((evmNetworks) => evmNetworks.map(({ id }) => id) as EvmNetworkId[])
    )
  }

  get evmNetworksListObservable() {
    return this.#evmNetworksSubject.pipe(
      map(
        (evmNetworks) =>
          Object.fromEntries(
            evmNetworks.map((evmNetwork) => [evmNetwork.id, evmNetwork])
          ) as EvmNetworkList
      )
    )
  }

  get tokensArrayObservable(): ReplaySubject<Token[]> {
    return this.#tokensSubject
  }

  get tokensIdsObservable() {
    return this.#tokensSubject.pipe(map((tokens) => tokens.map(({ id }) => id) as TokenId[]))
  }

  get tokensListObservable() {
    return this.#tokensSubject.pipe(
      map((token) => Object.fromEntries(token.map((chains) => [chains.id, chains])) as TokenList)
    )
  }

  setOnfinalityApiKey(apiKey: string | undefined) {
    this.#onfinalityApiKey = apiKey
  }

  async chainIds(): Promise<ChainId[]> {
    try {
      return await firstValueFrom(this.chainsIdsObservable)
    } catch (cause) {
      throw new Error("Failed to get chainIds", { cause })
    }
  }
  async chains(): Promise<ChainList> {
    try {
      return await firstValueFrom(this.chainsListObservable)
    } catch (cause) {
      throw new Error("Failed to get chains", { cause })
    }
  }

  async chainsArray() {
    try {
      return await firstValueFrom(this.chainsArrayObservable)
    } catch (cause) {
      throw new Error("Failed to get chains", { cause })
    }
  }

  async getChain(chainId: ChainId): Promise<Chain | CustomChain | null> {
    try {
      const chainsMap = await firstValueFrom(this.chainsListObservable)
      return chainsMap[chainId] ?? null
    } catch (cause) {
      throw new Error("Failed to get chain", { cause })
    }
  }

  async getChainByGenesisHash(genesisHash: `0x${string}`): Promise<Chain | CustomChain | null> {
    try {
      const chainsMap = await firstValueFrom(this.chainsByGenesisHashObservable)
      return chainsMap[genesisHash] ?? null
    } catch (cause) {
      throw new Error("Failed to get chain", { cause })
    }
  }

  async evmNetworkIds(): Promise<EvmNetworkId[]> {
    try {
      return await firstValueFrom(this.evmNetworksIdsObservable)
    } catch (cause) {
      throw new Error("Failed to get evmNetworkIds", { cause })
    }
  }
  async evmNetworks(): Promise<EvmNetworkList> {
    try {
      return await firstValueFrom(this.evmNetworksListObservable)
    } catch (cause) {
      throw new Error("Failed to get evmNetworks", { cause })
    }
  }

  async evmNetworksArray() {
    try {
      return await firstValueFrom(this.evmNetworksArrayObservable)
    } catch (cause) {
      throw new Error("Failed to get evmNetworks", { cause })
    }
  }
  async getEvmNetwork(evmNetworkId: EvmNetworkId): Promise<EvmNetwork | CustomEvmNetwork | null> {
    try {
      const evmNetworksMap = await firstValueFrom(this.evmNetworksListObservable)
      return evmNetworksMap[evmNetworkId] ?? null
    } catch (cause) {
      throw new Error("Failed to get evmNetwork", { cause })
    }
  }

  async tokenIds(): Promise<TokenId[]> {
    try {
      return await firstValueFrom(this.tokensIdsObservable)
    } catch (cause) {
      throw new Error("Failed to get tokenIds", { cause })
    }
  }
  async tokens(): Promise<TokenList> {
    try {
      return await firstValueFrom(this.tokensListObservable)
    } catch (cause) {
      throw new Error("Failed to get tokens", { cause })
    }
  }

  async tokensArray(): Promise<Token[]> {
    try {
      return await firstValueFrom(this.tokensArrayObservable)
    } catch (cause) {
      throw new Error("Failed to get tokens", { cause })
    }
  }
  async getToken(tokenId: TokenId): Promise<Token | null> {
    try {
      const tokensMap = await firstValueFrom(this.tokensListObservable)
      return tokensMap[tokenId] ?? null
    } catch (cause) {
      throw new Error("Failed to get token", { cause })
    }
  }

  async addCustomChain(customChain: CustomChain) {
    try {
      if (!("isCustom" in customChain && customChain.isCustom)) return
      return await this.#db.chains.put(customChain)
    } catch (cause) {
      throw new Error("Failed to add custom chain", { cause })
    }
  }
  async removeCustomChain(chainId: ChainId) {
    try {
      return await this.#db.chains
        // only affect custom chains
        .filter((chain) => "isCustom" in chain && chain.isCustom)
        // only affect the provided chainId
        .filter((chain) => chain.id === chainId)
        // delete the chain (if exists)
        .delete()
    } catch (cause) {
      throw new Error("Failed to remove custom chain", { cause })
    }
  }

  subscribeCustomChains() {
    return this.#chainsSubject.pipe(
      map((chains) =>
        chains.filter((chain): chain is CustomChain => "isCustom" in chain && chain.isCustom)
      )
    )
  }

  setCustomChains(chains: CustomChain[]) {
    return this.#db.transaction("rw", this.#db.chains, async () => {
      const keys = await this.#db.chains
        .filter((chain) => "isCustom" in chain && chain.isCustom)
        .primaryKeys()

      await this.#db.chains.bulkDelete(keys)
      await this.#db.chains.bulkPut(chains.filter((chain) => chain.isCustom))
    })
  }

  async resetChain(chainId: ChainId) {
    const builtInChain = await fetchChain(chainId)
    if (!builtInChain) throw new Error("Cannot reset non-built-in chain")
    if (!builtInChain.nativeToken?.id)
      throw new Error("Failed to lookup native token (no token exists for chain)")
    const builtInNativeToken = await fetchToken(builtInChain?.nativeToken?.id)
    if (!isITokenPartial(builtInNativeToken)) throw new Error("Failed to lookup native token")
    if (!isToken(builtInNativeToken))
      throw new Error("Failed to lookup native token (isToken test failed)")

    try {
      return await this.#db.transaction("rw", this.#db.chains, this.#db.tokens, async () => {
        // delete chain and its native tokens (ensures cleanup of tokens with legacy ids)
        await this.#db.tokens
          .filter((token) => token.type === "substrate-native" && token.chain?.id === chainId)
          .delete()
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
      if (!("isCustom" in customEvmNetwork && customEvmNetwork.isCustom)) return Promise.resolve()
      return await this.#db.evmNetworks.put(customEvmNetwork)
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
    return this.#evmNetworksSubject.pipe(
      map((networks) =>
        networks.filter(
          (network): network is CustomEvmNetwork => "isCustom" in network && network.isCustom
        )
      )
    )
  }

  setCustomEvmNetworks(networks: CustomEvmNetwork[]) {
    return this.#db.transaction("rw", this.#db.evmNetworks, async () => {
      const keys = await this.#db.evmNetworks
        .filter((network) => "isCustom" in network && network.isCustom)
        .primaryKeys()

      await this.#db.evmNetworks.bulkDelete(keys)
      await this.#db.evmNetworks.bulkPut(networks.filter((network) => network.isCustom))
    })
  }

  async resetEvmNetwork(evmNetworkId: EvmNetworkId) {
    const builtInEvmNetwork: EvmNetwork = await fetchEvmNetwork(evmNetworkId)
    if (!builtInEvmNetwork) throw new Error("Cannot reset non-built-in EVM network")

    const nativeModule = builtInEvmNetwork.balancesConfig.find(
      (c: { moduleType: string }) => c.moduleType === "evm-native"
    )
    if (!nativeModule?.moduleConfig)
      throw new Error("Failed to lookup native token (no token exists for network)")

    const { symbol, decimals, coingeckoId, logo, mirrorOf, dcentName } =
      nativeModule.moduleConfig as IToken
    if (!symbol) throw new Error("Missing native token symbol")
    if (!decimals) throw new Error("Missing native token decimals")

    const builtInNativeToken: IToken = {
      id: getNativeTokenId(evmNetworkId, "evm-native"),
      type: "evm-native",
      evmNetwork: { id: evmNetworkId },
      isTestnet: builtInEvmNetwork.isTestnet ?? false,
      isDefault: true,
      symbol,
      decimals,
      coingeckoId,
      logo,
      mirrorOf,
      dcentName,
    }

    builtInEvmNetwork.nativeToken = { id: builtInNativeToken.id }

    try {
      return await this.#db.transaction("rw", this.#db.evmNetworks, this.#db.tokens, async () => {
        // delete chain and its native tokens (ensures cleanup of tokens with legacy ids)
        await this.#db.tokens
          .filter((token) => token.type === "evm-native" && token.evmNetwork?.id === evmNetworkId)
          .delete()
        const networkToDelete = await this.#db.evmNetworks.get(evmNetworkId)
        if (networkToDelete?.nativeToken?.id)
          await this.#db.tokens.delete(networkToDelete.nativeToken.id)
        await this.#db.evmNetworks.delete(evmNetworkId)

        // reprovision them from subsquid data
        await this.#db.evmNetworks.put(builtInEvmNetwork)
        await this.#db.tokens.put(builtInNativeToken as never)
      })
    } catch (cause) {
      throw new Error("Failed to reset evm network", { cause })
    }
  }

  async addCustomToken(customToken: Token) {
    try {
      if (!("isCustom" in customToken && customToken.isCustom)) return Promise.resolve()
      return await this.#db.tokens.put(customToken)
    } catch (cause) {
      throw new Error("Failed to add custom token", { cause })
    }
  }

  async removeCustomToken(tokenId: TokenId) {
    try {
      return await this.#db.tokens
        // only affect custom tokens
        .filter((token) => "isCustom" in token && token.isCustom)
        // only affect the provided token
        .filter((token) => token.id === tokenId)
        // delete the token (if exists)
        .delete()
    } catch (cause) {
      throw new Error("Failed to remove custom token", { cause })
    }
  }

  // Need to explicitly type the return type
  // else TypeScript will resolve it to `IToken` instead
  subscribeCustomTokens(): Observable<Token[]> {
    return this.#tokensSubject.pipe(
      map((tokens) =>
        tokens.filter((token): token is Token => "isCustom" in token && token.isCustom)
      )
    )
  }

  setCustomTokens(tokens: Token[]) {
    return this.#db.transaction("rw", this.#db.tokens, async () => {
      const keys = await this.#db.tokens
        .filter((token) => "isCustom" in token && token.isCustom)
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
  async hydrate({
    // chainsArgs, // hydrateChains has no args
    // evmNetworksArgs, // hydrateEvmNetworks has no args
    tokensArgs,
  }: {
    chainsArgs?: Parameters<ChaindataProviderExtension["hydrateChains"]>
    evmNetworksArgs?: Parameters<ChaindataProviderExtension["hydrateEvmNetworks"]>
    tokensArgs?: Parameters<ChaindataProviderExtension["hydrateTokens"]>
  } = {}): Promise<boolean> {
    return (
      (
        await Promise.all([
          // call inner hydration methods
          this.hydrateChains(),
          this.hydrateEvmNetworks(),
          this.hydrateTokens(...(tokensArgs ? tokensArgs : [])),
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

      // TODO check if alec is this the right way to set native token
      // note : many chains don't have a native module provisionned from chaindata => breaks edit network screen and probably send funds and tx screens
      for (const chain of chains) {
        const nativeTokenModule = chain.balancesConfig.find(
          (c) => c.moduleType === "substrate-native"
        )
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const symbol = (nativeTokenModule?.moduleConfig as any)?.symbol
        if (!symbol) continue

        chain.nativeToken = { id: getNativeTokenId(chain.id, "substrate-native") }
      }

      await this.#db.transaction("rw", this.#db.chains, async () => {
        await this.#db.chains.filter((chain) => !("isCustom" in chain && chain.isCustom)).delete()

        // add all except ones matching custom existing ones (user may customize built-in chains)
        const customChainIds = (await this.#db.chains.toArray()).map((chain) => chain.id)
        const newChains = chains.filter((chain) => !customChainIds.includes(chain.id))
        await this.#db.chains.bulkPut(newChains)
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

      // set native token
      for (const evmNetwork of evmNetworks) {
        evmNetwork.nativeToken = { id: getNativeTokenId(evmNetwork.id, "evm-native") }
      }

      await this.#db.transaction("rw", this.#db.evmNetworks, async () => {
        await this.#db.evmNetworks
          .filter((network) => !("isCustom" in network && network.isCustom))
          .delete()

        // add all except ones matching custom existing ones (user may customize built-in networks)
        const customNetworkIds = (await this.#db.evmNetworks.toArray()).map((network) => network.id)
        const newNetworks = evmNetworks.filter((network) => !customNetworkIds.includes(network.id))
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

    await this.#db.transaction("rw", this.#db.tokens, this.#db.chains, async () => {
      await this.#db.tokens.bulkDelete(notCustomTokenIds)
      await this.#db.tokens.bulkPut(newTokens.filter((token) => !customTokenIds.includes(token.id)))
      //if (chain && shouldUpdateChain) await this.#db.chains.put(chain)
    })
  }

  async updateEvmNetworkTokens(newTokens: Token[]) {
    const existingEvmNetworkTokens = await this.#db.tokens
      .filter((t) => t.type.startsWith("evm-"))
      .toArray()

    const isCustomToken = (token: Token) => "isCustom" in token && token.isCustom

    // don't override custom tokens
    const customTokenIds = new Set<string>()

    // delete non-custom tokens which aren't in `newTokens`
    const deleteTokenIds = new Set<string>()

    for (const token of existingEvmNetworkTokens) {
      if (isCustomToken(token)) customTokenIds.add(token.id)
      else deleteTokenIds.add(token.id)
    }

    const tokensToUpdate = newTokens.filter((token) => {
      deleteTokenIds.delete(token.id)
      return !customTokenIds.has(token.id)
    })

    this.#db.transaction("rw", this.#db.tokens, async () => {
      // delete all existing non custom tokens
      await this.#db.tokens.bulkDelete([...deleteTokenIds])

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
  async hydrateTokens(chainIdFilter?: ChainId[]) {
    const now = Date.now()
    if (now - this.#lastHydratedTokensAt < minimumHydrationInterval) return false

    const dbHasTokens = (await this.#db.tokens.count()) > 0

    try {
      try {
        var tokens = parseTokensResponse(await fetchTokens()) // eslint-disable-line no-var
        if (tokens.length <= 0) throw new Error("Ignoring empty chaindata tokens response")
      } catch (error) {
        if (dbHasTokens) throw error

        // On first start-up (db is empty), if we fail to fetch tokens then we should
        // initialize the DB with the list of tokens inside our init/tokens.json file.
        // This data will represent a relatively recent copy of what's in the squid,
        // which will be better for our users than to have nothing at all.
        var tokens = parseTokensResponse(await fetchInitTokens()) // eslint-disable-line no-var
      }

      await this.#db.transaction("rw", this.#db.tokens, async () => {
        const deleteChains = chainIdFilter ? new Set(chainIdFilter) : undefined

        const tokensToDelete = (await this.#db.tokens.toArray())
          .filter((token) => {
            // don't delete custom tokens
            if ("isCustom" in token && token.isCustom) return false

            // delete all other tokens if chainIdFilter is not specified
            if (deleteChains === undefined) return true

            // delete tokens on chainIdFilter chains is it is specified
            if (token.chain?.id && deleteChains.has(token.chain.id)) return true

            return false
          })
          .map((token) => token.id)

        if (tokensToDelete.length) await this.#db.tokens.bulkDelete(tokensToDelete)

        // add all except ones matching custom existing ones (user may customize built-in tokens)
        const customTokenIds = (await this.#db.tokens.toArray()).map((token) => token.id)
        const newTokens = tokens.filter((token) => {
          // don't replace custom tokens
          if (customTokenIds.includes(token.id)) return false

          if (deleteChains === undefined) return true

          if (!token.chain?.id) return true
          if (deleteChains.has(token.chain.id)) return true

          return false
        })
        await this.#db.tokens.bulkPut(newTokens)
      })
      this.#lastHydratedTokensAt = now
      return true
    } catch (error) {
      log.warn(`Failed to hydrate tokens from chaindata`, error)
      return false
    }
  }

  async getIsBuiltInChain(chainId: ChainId) {
    const chain = await fetchChain(chainId)
    return !!chain
  }

  async getIsBuiltInEvmNetwork(evmNetworkId: EvmNetworkId) {
    try {
      const evmNetwork = await fetchEvmNetwork(evmNetworkId)
      return !!evmNetwork
    } catch (e) {
      return false
    }
  }

  transaction<U>(
    mode: TransactionMode,
    tables: string[],
    scope: (trans: Transaction) => PromiseLike<U> | U
  ): PromiseExtended<U> {
    return this.#db.transaction(mode, tables, scope)
  }
}
