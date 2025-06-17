import { firstValueFrom, map, of, shareReplay } from "rxjs"

import {
  DotNetwork,
  EthNetwork,
  isDotNetwork,
  isEthNetwork,
  Network,
  Token,
  TokenId,
} from "./chaindata"
import { defaultChaindata$ } from "./state"
import { ChainId, CustomChain, CustomEvmNetwork, EvmNetworkId, IChaindataProvider } from "./types"
import * as util from "./util"

export type ChaindataProviderOptions = {
  onfinalityApiKey?: string
}

export class ChaindataProvider implements IChaindataProvider {
  // #db: TalismanChaindataDatabase
  #onfinalityApiKey?: string
  // #liveQueries: SubscriptionLike[]
  // #lastHydratedChainsAt = 0
  // #lastHydratedEvmNetworksAt = 0
  // #lastHydratedTokensAt = 0

  constructor(options?: ChaindataProviderOptions) {
    this.#onfinalityApiKey = options?.onfinalityApiKey ?? undefined
  }
  //   this.#db = new TalismanChaindataDatabase()

  //   this.#liveQueries = [
  //     liveQuery(() => this.#db.chains.toArray()).subscribe(this.chainsObservable),
  //     liveQuery(() => this.#db.evmNetworks.toArray()).subscribe(this.evmNetworksObservable),
  //     liveQuery(() => this.#db.tokens.toArray()).subscribe(this.tokensObservable),
  //   ]
  // }

  // destroy() {
  //   this.#liveQueries.forEach((subscription) => subscription.unsubscribe())
  // }

  /** @deprecated */
  setOnfinalityApiKey(apiKey: string | undefined) {
    this.#onfinalityApiKey = apiKey
  }

  miniMetadatasObservable = defaultChaindata$.pipe(
    map(({ miniMetadatas }) => miniMetadatas),
    shareReplay({ bufferSize: 1, refCount: true }),
  )

  async miniMetadatas() {
    return await util.wrapObservableWithGetter(
      "Failed to get miniMetadatas",
      this.miniMetadatasObservable,
    )
  }

  //
  // base items
  //

  chainsObservable = defaultChaindata$.pipe(
    map(({ networks }) => networks.filter(isDotNetwork)),
    shareReplay({ bufferSize: 1, refCount: true }),
  )
  async chains() {
    return await util.wrapObservableWithGetter("Failed to get chains", this.chainsObservable)
  }

  evmNetworksObservable = defaultChaindata$.pipe(
    map(({ networks }) => networks.filter(isEthNetwork)),
    shareReplay({ bufferSize: 1, refCount: true }),
  )
  async evmNetworks() {
    return await util.wrapObservableWithGetter(
      "Failed to get evmNetworks",
      this.evmNetworksObservable,
    )
  }

  networksObservable = defaultChaindata$.pipe(
    map(({ networks }) => networks),
    shareReplay({ bufferSize: 1, refCount: true }),
  )
  async networks() {
    return await util.wrapObservableWithGetter("Failed to get networks", this.networksObservable)
  }

  tokensObservable = defaultChaindata$.pipe(
    map(({ tokens }) => tokens),
    shareReplay({ bufferSize: 1, refCount: true }),
  )
  async tokens(): Promise<Token[]> {
    return await util.wrapObservableWithGetter("Failed to get tokens", this.tokensObservable)
  }

  //
  // custom item observables
  //

  get customChainsObservable() {
    // TODO
    return of([] as DotNetwork[])
    // return this.chainsObservable.pipe(map(util.customChainsFilter))
  }
  async customChains() {
    return await util.wrapObservableWithGetter(
      "Failed to get custom chains",
      this.customChainsObservable,
    )
  }

  get customEvmNetworksObservable() {
    // TODO
    return of([] as EthNetwork[])
    // return this.evmNetworksObservable.pipe(map(util.customEvmNetworksFilter))
  }
  async customEvmNetworks() {
    return await util.wrapObservableWithGetter(
      "Failed to get custom evmNetworks",
      this.customEvmNetworksObservable,
    )
  }

  get customNetworksObservable() {
    // TODO
    return of([] as Network[])
    // return this.evmNetworksObservable.pipe(map(util.customEvmNetworksFilter))
  }
  async customNetworks() {
    return await util.wrapObservableWithGetter(
      "Failed to get custom networks",
      this.customNetworksObservable,
    )
  }

  get customTokensObservable() {
    // TODO
    return of([] as Token[])
    // return this.tokensObservable.pipe(map(util.customTokensFilter))
  }
  async customTokens() {
    return await util.wrapObservableWithGetter(
      "Failed to get custom tokens",
      this.customTokensObservable,
    )
  }

  //
  // item ids
  //

  get chainIdsObservable() {
    return this.chainsObservable.pipe(map(util.itemsToIds))
  }
  async chainIds() {
    return await util.wrapObservableWithGetter("Failed to get chainIds", this.chainIdsObservable)
  }

  get evmNetworkIdsObservable() {
    return this.evmNetworksObservable.pipe(map(util.itemsToIds))
  }
  async evmNetworkIds() {
    return await util.wrapObservableWithGetter(
      "Failed to get evmNetworkIds",
      this.evmNetworkIdsObservable,
    )
  }

  get networkIdsObservable() {
    return this.networksObservable.pipe(map(util.itemsToIds))
  }
  async networkIds() {
    return await util.wrapObservableWithGetter(
      "Failed to get networkIds",
      this.networkIdsObservable,
    )
  }

  get tokenIdsObservable() {
    return this.tokensObservable.pipe(map(util.itemsToIds))
  }
  async tokenIds() {
    return await util.wrapObservableWithGetter("Failed to get tokenIds", this.tokenIdsObservable)
  }

  //
  // items by id
  //

  get chainsByIdObservable() {
    return this.chainsObservable.pipe(map(util.itemsToMapById))
  }
  async chainsById() {
    return await util.wrapObservableWithGetter(
      "Failed to get chains by id",
      this.chainsByIdObservable,
    )
  }

  get evmNetworksByIdObservable() {
    return this.evmNetworksObservable.pipe(map(util.itemsToMapById))
  }
  async evmNetworksById() {
    return await util.wrapObservableWithGetter(
      "Failed to get evmNetworks by id",
      this.evmNetworksByIdObservable,
    )
  }

  get networksByIdObservable() {
    return this.networksObservable.pipe(map(util.itemsToMapById))
  }
  async networksById() {
    return await util.wrapObservableWithGetter(
      "Failed to get networks by id",
      this.networksByIdObservable,
    )
  }

  get tokensByIdObservable() {
    return this.tokensObservable.pipe(map(util.itemsToMapById))
  }
  async tokensById() {
    return await util.wrapObservableWithGetter(
      "Failed to get tokens by id",
      this.tokensByIdObservable,
    )
  }

  async tokensByIdForType<TokenType extends Token["type"]>(type: TokenType) {
    const tokensByIdForTypeObservable = this.tokensObservable
      .pipe(map((tokens) => tokens.filter((token) => token.type === type)))
      .pipe(map(util.itemsToMapById))
    return await util.wrapObservableWithGetter(
      "Failed to get tokenIds",
      tokensByIdForTypeObservable,
    )
  }

  //
  // items by genesisHash
  //

  get chainsByGenesisHashObservable() {
    return this.chainsObservable.pipe(map(util.itemsToMapByGenesisHash))
  }
  async chainsByGenesisHash() {
    return await util.wrapObservableWithGetter(
      "Failed to get chains by genesisHash",
      this.chainsByGenesisHashObservable,
    )
  }

  get networksByGenesisHashObservable() {
    return this.networksObservable.pipe(
      map((n) => n.filter(isDotNetwork)),
      map(util.itemsToMapByGenesisHash),
    )
  }
  async networksByGenesisHash() {
    return await util.wrapObservableWithGetter(
      "Failed to get networks by genesisHash",
      this.networksByGenesisHashObservable,
    )
  }

  //
  // filters for a single item
  //

  async chainById(chainId: ChainId) {
    return await util.withErrorReason(
      "Failed to get chain by id",
      async (): Promise<DotNetwork | null> => (await this.chainsById())[chainId] ?? null,
    )
  }

  async chainByGenesisHash(genesisHash: `0x${string}`) {
    return await util.withErrorReason(
      "Failed to get chain by genesisHash",
      async (): Promise<DotNetwork | null> =>
        (await this.chainsByGenesisHash())[genesisHash] ?? null,
    )
  }

  async evmNetworkById(evmNetworkId: EvmNetworkId) {
    return await util.withErrorReason(
      "Failed to get evmNetwork by id",
      async (): Promise<EthNetwork | null> => (await this.evmNetworksById())[evmNetworkId] ?? null,
    )
  }

  async networkById(evmNetworkId: EvmNetworkId) {
    return await util.withErrorReason(
      "Failed to get evmNetwork by id",
      async (): Promise<EthNetwork | null> => (await this.evmNetworksById())[evmNetworkId] ?? null,
    )
  }

  async networkByGenesisHash(genesisHash: `0x${string}`) {
    return await util.withErrorReason(
      "Failed to get network by genesisHash",
      async (): Promise<DotNetwork | null> =>
        (await this.networksByGenesisHash())[genesisHash] ?? null,
    )
  }

  async tokenById(tokenId: TokenId) {
    return await util.withErrorReason(
      "Failed to get token by id",
      async (): Promise<Token | null> => (await this.tokensById())[tokenId] ?? null,
    )
  }

  //
  // mutations / methods with side-effects
  //

  async addCustomChain(_customChain: CustomChain) {
    throw new Error("Not implemented")
    // try {
    //   if (!("isCustom" in customChain && customChain.isCustom)) return
    //   return await this.#db.chains.put(customChain)
    // } catch (cause) {
    //   throw new Error("Failed to add custom chain", { cause })
    // }
  }

  async removeCustomChain(_chainId: ChainId) {
    throw new Error("Not implemented")
    // try {
    //   return await this.#db.chains
    //     // only affect custom chains
    //     .filter((chain) => "isCustom" in chain && chain.isCustom)
    //     // only affect the provided chainId
    //     .filter((chain) => chain.id === chainId)
    //     // delete the chain (if exists)
    //     .delete()
    // } catch (cause) {
    //   throw new Error("Failed to remove custom chain", { cause })
    // }
  }

  async setCustomChains(_chains: CustomChain[]) {
    throw new Error("Not implemented")
    // return await this.#db.transaction("rw", this.#db.chains, async () => {
    //   const keys = await this.#db.chains
    //     .filter((chain) => "isCustom" in chain && chain.isCustom)
    //     .primaryKeys()

    //   await this.#db.chains.bulkDelete(keys)
    //   await this.#db.chains.bulkPut(chains.filter((chain) => chain.isCustom))
    // })
  }

  async resetChain(_chainId: ChainId) {
    throw new Error("Not implemented")
    // const builtInChain = await fetchChain(chainId)
    // if (!builtInChain) throw new Error("Cannot reset non-built-in chain")
    // if (!builtInChain.nativeTokenId)
    //   throw new Error("Failed to lookup native token (no token exists for chain)")
    // const builtInNativeToken = await fetchSubstrateToken(builtInChain?.nativeTokenId)
    // if (!util.isTokenPartial(builtInNativeToken)) throw new Error("Failed to lookup native token")
    // if (!util.isToken(builtInNativeToken))
    //   throw new Error("Failed to lookup native token (isToken test failed)")

    // try {
    //   return await this.#db.transaction("rw", this.#db.chains, this.#db.tokens, async () => {
    //     // delete chain and its native tokens (ensures cleanup of tokens with legacy ids)
    //     await this.#db.tokens
    //       .filter((token) => token.type === "substrate-native" && token.networkId === chainId)
    //       .delete()
    //     await this.#db.chains.delete(chainId)

    //     // reprovision them from subsquid data
    //     await this.#db.chains.put(builtInChain)
    //     await this.#db.tokens.put(builtInNativeToken)
    //   })
    // } catch (cause) {
    //   throw new Error("Failed to reset chain", { cause })
    // }
  }

  async addCustomEvmNetwork(_customEvmNetwork: CustomEvmNetwork) {
    throw new Error("Not implemented")
    // try {
    //   if (!("isCustom" in customEvmNetwork && customEvmNetwork.isCustom)) return Promise.resolve()
    //   return await this.#db.evmNetworks.put(customEvmNetwork)
    // } catch (cause) {
    //   throw new Error("Failed to add custom evm network", { cause })
    // }
  }

  async removeCustomEvmNetwork(_evmNetworkId: EvmNetworkId) {
    // if (await this.getIsBuiltInEvmNetwork(evmNetworkId))
    //   throw new Error("Cannot remove built-in EVM network")
    // try {
    //   return this.#db.transaction("rw", [this.#db.evmNetworks, this.#db.tokens], async () => {
    //     await this.#db.evmNetworks.delete(evmNetworkId)
    //     await this.#db.tokens.filter((token) => token.networkId === evmNetworkId).delete()
    //   })
    // } catch (cause) {
    //   throw new Error("Failed to remove custom evm network", { cause })
    // }
  }

  async setCustomEvmNetworks(_networks: CustomEvmNetwork[]) {
    // return await this.#db.transaction("rw", this.#db.evmNetworks, async () => {
    //   const keys = await this.#db.evmNetworks
    //     .filter((network) => "isCustom" in network && network.isCustom)
    //     .primaryKeys()
    //   await this.#db.evmNetworks.bulkDelete(keys)
    //   await this.#db.evmNetworks.bulkPut(networks.filter((network) => network.isCustom))
    // })
  }

  async resetEvmNetwork(_evmNetworkId: EvmNetworkId) {
    // const builtInEvmNetwork: EvmNetwork = await fetchEvmNetwork(evmNetworkId)
    // if (!builtInEvmNetwork) throw new Error("Cannot reset non-built-in EVM network")
    // const nativeModule = builtInEvmNetwork.balancesConfig.find(
    //   (c: { moduleType: string }) => c.moduleType === "evm-native",
    // )
    // if (!nativeModule?.moduleConfig)
    //   throw new Error("Failed to lookup native token (no token exists for network)")
    // const { symbol, decimals, coingeckoId, logo, mirrorOf, name, noDiscovery } =
    //   nativeModule.moduleConfig as Token
    // if (!symbol) throw new Error("Missing native token symbol")
    // if (!decimals) throw new Error("Missing native token decimals")
    // const builtInNativeToken: Token = {
    //   id: getNativeTokenId(evmNetworkId, "evm-native"),
    //   type: "evm-native",
    //   platform: "ethereum",
    //   networkId: evmNetworkId,
    //   isTestnet: builtInEvmNetwork.isTestnet ?? false,
    //   isDefault: true,
    //   symbol,
    //   decimals,
    //   name: name ?? symbol,
    //   coingeckoId,
    //   logo,
    // }
    // if (mirrorOf) builtInNativeToken.mirrorOf = mirrorOf
    // if (noDiscovery) builtInNativeToken.noDiscovery = noDiscovery
    // builtInEvmNetwork.nativeToken = { id: builtInNativeToken.id }
    // try {
    //   return await this.#db.transaction("rw", this.#db.evmNetworks, this.#db.tokens, async () => {
    //     // delete chain and its native tokens (ensures cleanup of tokens with legacy ids)
    //     await this.#db.tokens
    //       .filter((token) => token.type === "evm-native" && token.networkId === evmNetworkId)
    //       .delete()
    //     const networkToDelete = await this.#db.evmNetworks.get(evmNetworkId)
    //     if (networkToDelete?.nativeTokenId)
    //       await this.#db.tokens.delete(networkToDeletenativeTokenId)
    //     await this.#db.evmNetworks.delete(evmNetworkId)
    //     // reprovision them from chaindata
    //     await this.#db.evmNetworks.put(builtInEvmNetwork)
    //     await this.#db.tokens.put(builtInNativeToken as never)
    //   })
    // } catch (cause) {
    //   throw new Error("Failed to reset evm network", { cause })
    // }
  }

  async addCustomToken(_customToken: Token): Promise<TokenId> {
    throw new Error("Not implemented")
    // try {
    //   if (!("isCustom" in customToken && customToken.isCustom)) return Promise.resolve()
    //   return await this.#db.tokens.put(customToken)
    // } catch (cause) {
    //   throw new Error("Failed to add custom token", { cause })
    // }
  }

  async removeCustomToken(_tokenId: TokenId) {
    // try {
    //   return await this.#db.tokens
    //     // only affect custom tokens
    //     .filter((token) => "isCustom" in token && Boolean(token.isCustom))
    //     // only affect the provided token
    //     .filter((token) => token.id === tokenId)
    //     // delete the token (if exists)
    //     .delete()
    // } catch (cause) {
    //   throw new Error("Failed to remove custom token", { cause })
    // }
  }

  async setCustomTokens(_tokens: Token[]) {
    // TODO custom tokens have to go into localstorage
    // return await this.#db.transaction("rw", this.#db.tokens, async () => {
    //   const keys = await this.#db.tokens
    //     .filter((token) => "isCustom" in token && Boolean(token.isCustom))
    //     .primaryKeys()
    //   await this.#db.tokens.bulkDelete(keys)
    //   await this.#db.tokens.bulkPut(tokens.filter((token) => "isCustom" in token && token.isCustom))
    // })
  }

  async removeToken(_tokenId: TokenId) {
    // try {
    //   return await this.#db.tokens.delete(tokenId)
    // } catch (cause) {
    //   throw new Error("Failed to remove token", { cause })
    // }
  }

  /**
   * Hydrate the db with the latest chaindata from subsquid.
   *
   * @returns A promise which resolves to true if any db table has been hydrated, or false if all hydration has been skipped.
   */
  async hydrate(): Promise<boolean> {
    await firstValueFrom(defaultChaindata$) // ensure the default chaindata is initialized
    return true
    // return (
    //   (
    //     await Promise.all([
    //       // call inner hydration methods
    //       this.hydrateChains(),
    //       this.hydrateEvmNetworks(),
    //       this.hydrateSubstrateTokens(...(tokensArgs ? tokensArgs : [])),
    //     ])
    //   )
    //     // return true if any hydration occurred
    //     .some(Boolean)
    // )
  }

  /**
   * Hydrate the db with the latest chains from subsquid.
   * Hydration is skipped when the last successful hydration was less than minimumHydrationInterval ms ago.
   *
   * @returns A promise which resolves to true if the db has been hydrated, or false if the hydration was skipped.
   */
  // async hydrateChains() {
  //   const now = Date.now()
  //   if (now - this.#lastHydratedChainsAt < minimumHydrationInterval) return false

  //   const dbHasChains = (await this.#db.chains.count()) > 0

  //   try {
  //     try {
  //       var chains = util.addCustomChainRpcs(await fetchChains(), this.#onfinalityApiKey) // eslint-disable-line no-var
  //       if (chains.length <= 0) throw new Error("Ignoring empty chaindata chains response")
  //     } catch (error) {
  //       if (dbHasChains) throw error

  //       // On first start-up (db is empty), if we fail to fetch chains then we should
  //       // initialize the DB with the list of chains inside our init/chains.json file.
  //       // This data will represent a relatively recent copy of what's in the squid,
  //       // which will be better for our users than to have nothing at all.
  //       var chains = util.addCustomChainRpcs(await fetchInitChains(), this.#onfinalityApiKey) // eslint-disable-line no-var
  //     }

  //     // TODO check if alec is this the right way to set native token
  //     // note : many chains don't have a native module provisionned from chaindata => breaks edit network screen and probably send funds and tx screens
  //     for (const chain of chains) {
  //       const nativeTokenModule = chain.balancesConfig.find(
  //         (c) => c.moduleType === "substrate-native",
  //       )
  //       // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //       const symbol = (nativeTokenModule?.moduleConfig as any)?.symbol
  //       if (!symbol) continue

  //       chain.nativeToken = { id: getNativeTokenId(chain.id, "substrate-native") }
  //     }

  //     await this.#db.transaction("rw", this.#db.chains, async () => {
  //       await this.#db.chains.filter((chain) => !("isCustom" in chain && chain.isCustom)).delete()

  //       // add all except ones matching custom existing ones (user may customize built-in chains)
  //       const customChainIds = (await this.#db.chains.toArray()).map((chain) => chain.id)
  //       const newChains = chains.filter((chain) => !customChainIds.includes(chain.id))
  //       await this.#db.chains.bulkPut(newChains)
  //     })
  //     this.#lastHydratedChainsAt = now

  //     return true
  //   } catch (error) {
  //     log.warn(`Failed to hydrate chains from chaindata`, error)

  //     return false
  //   }
  // }

  // /**
  //  * Hydrate the db with the latest evmNetworks from subsquid.
  //  * Hydration is skipped when the last successful hydration was less than minimumHydrationInterval ms ago.
  //  *
  //  * @returns A promise which resolves to true if the db has been hydrated, or false if the hydration was skipped.
  //  */
  // async hydrateEvmNetworks() {
  //   const now = Date.now()
  //   if (now - this.#lastHydratedEvmNetworksAt < minimumHydrationInterval) return false

  //   const dbHasEvmNetworks = (await this.#db.evmNetworks.count()) > 0

  //   try {
  //     try {
  //       var evmNetworks: EvmNetwork[] = await fetchEvmNetworks() // eslint-disable-line no-var
  //       if (evmNetworks.length <= 0)
  //         throw new Error("Ignoring empty chaindata evmNetworks response")
  //     } catch (error) {
  //       if (dbHasEvmNetworks) throw error

  //       // On first start-up (db is empty), if we fail to fetch evmNetworks then we should
  //       // initialize the DB with the list of evmNetworks inside our init/evm-networks.json file.
  //       // This data will represent a relatively recent copy of what's in the squid,
  //       // which will be better for our users than to have nothing at all.
  //       var evmNetworks: EvmNetwork[] = await fetchInitEvmNetworks() // eslint-disable-line no-var
  //     }

  //     // set native token
  //     for (const evmNetwork of evmNetworks) {
  //       evmNetwork.nativeToken = { id: getNativeTokenId(evmNetwork.id, "evm-native") }
  //     }

  //     await this.#db.transaction("rw", this.#db.evmNetworks, async () => {
  //       await this.#db.evmNetworks
  //         .filter((network) => !("isCustom" in network && network.isCustom))
  //         .delete()

  //       // remaining entries are custom networks
  //       const existingCustomNetworks = await this.#db.evmNetworks.toArray()
  //       const existingCustomNetworksById = Object.fromEntries(
  //         existingCustomNetworks.map((network) => [network.id, network]),
  //       )

  //       // dont override custom networks, except for the balancesConfig property
  //       const newNetworks = evmNetworks.map((network) => {
  //         const existing = existingCustomNetworksById[network.id]
  //         return existing
  //           ? Object.assign({}, existing, { balancesConfig: network.balancesConfig })
  //           : network
  //       })

  //       await this.#db.evmNetworks.bulkPut(newNetworks)
  //     })
  //     this.#lastHydratedEvmNetworksAt = now

  //     return true
  //   } catch (error) {
  //     log.warn(`Failed to hydrate evmNetworks from chaindata`, error)

  //     return false
  //   }
  // }

  // async updateChainTokens(
  //   chainId: ChainId,
  //   source: string,
  //   newTokens: Token[],
  //   availableTokenLogoFilenames: string[],
  // ) {
  //   // TODO: Test logos and fall back to unknown token logo url
  //   // (Maybe put the test into each balance module itself)

  //   const existingChainTokens = await this.#db.tokens
  //     .filter((token) => token.networkId === chainId && token.type === source)
  //     .toArray()

  //   newTokens.forEach((token) => {
  //     if (token.logo) return

  //     const symbolLogo = token.symbol.toLowerCase().replace(/ /g, "_")
  //     if (availableTokenLogoFilenames.includes(`${symbolLogo}.svg`)) {
  //       return (token.logo = githubTokenLogoUrl(symbolLogo))
  //     }

  //     // TODO: Use coingeckoId logo if exists

  //     return (token.logo = githubUnknownTokenLogoUrl)
  //   })

  //   const notCustomTokenIds = existingChainTokens
  //     .filter((token) => !("isCustom" in token && token.isCustom))
  //     .map((token) => token.id)
  //   const customTokenIds = existingChainTokens
  //     .filter((token) => "isCustom" in token && token.isCustom)
  //     .map((token) => token.id)

  //   await this.#db.transaction("rw", this.#db.tokens, this.#db.chains, async () => {
  //     await this.#db.tokens.bulkDelete(notCustomTokenIds)
  //     await this.#db.tokens.bulkPut(newTokens.filter((token) => !customTokenIds.includes(token.id)))
  //     //if (chain && shouldUpdateChain) await this.#db.chains.put(chain)
  //   })
  // }

  async updateEvmNetworkTokens(_newTokens: Token[]) {
    // const existingEvmNetworkTokens = await this.#db.tokens
    //   .filter((t) => t.type.startsWith("evm-"))
    //   .toArray()
    // const isCustomToken = (token: Token) => "isCustom" in token && token.isCustom
    // // don't override custom tokens
    // const customTokenIds = new Set<string>()
    // // delete non-custom tokens which aren't in `newTokens`
    // const deleteTokenIds = new Set<string>()
    // for (const token of existingEvmNetworkTokens) {
    //   if (isCustomToken(token)) customTokenIds.add(token.id)
    //   else deleteTokenIds.add(token.id)
    // }
    // const tokensToUpdate = newTokens.filter((token) => {
    //   deleteTokenIds.delete(token.id)
    //   return !customTokenIds.has(token.id)
    // })
    // this.#db.transaction("rw", this.#db.tokens, async () => {
    //   // delete all existing non custom tokens
    //   await this.#db.tokens.bulkDelete([...deleteTokenIds])
    //   // force update on all non custom tokens
    //   await this.#db.tokens.bulkPut(tokensToUpdate)
    // })
  }

  /**
   * Hydrate the db with the latest tokens from subsquid.
   * Hydration is skipped when the last successful hydration was less than minimumHydrationInterval ms ago.
   *
   * @returns A promise which resolves to true if the db has been hydrated, or false if the hydration was skipped.
   */
  async hydrateSubstrateTokens(_chainIdFilter?: ChainId[]) {
    // const now = Date.now()
    // if (now - this.#lastHydratedTokensAt < minimumHydrationInterval) return false
    // const dbHasTokens = (await this.#db.tokens.count()) > 0
    // try {
    //   try {
    //     var tokens = util.parseTokensResponse(await fetchSubstrateTokens()) // eslint-disable-line no-var
    //     if (tokens.length <= 0) throw new Error("Ignoring empty chaindata tokens response")
    //   } catch (error) {
    //     if (dbHasTokens) throw error
    //     // On first start-up (db is empty), if we fail to fetch tokens then we should
    //     // initialize the DB with the list of tokens inside our init/tokens.json file.
    //     // This data will represent a relatively recent copy of what's in the squid,
    //     // which will be better for our users than to have nothing at all.
    //     var tokens = util.parseTokensResponse(await fetchInitSubstrateTokens()) // eslint-disable-line no-var
    //   }
    //   await this.#db.transaction("rw", this.#db.tokens, async () => {
    //     const deleteChains = chainIdFilter ? new Set(chainIdFilter) : undefined
    //     const tokensToDelete = (await this.#db.tokens.toArray())
    //       .filter((token) => {
    //         // don't delete custom tokens
    //         if ("isCustom" in token && token.isCustom) return false
    //         // delete all other tokens if chainIdFilter is not specified
    //         if (deleteChains === undefined) return true
    //         // delete tokens on chainIdFilter chains is it is specified
    //         if (token.networkId && deleteChains.has(token.networkId)) return true
    //         return false
    //       })
    //       .map((token) => token.id)
    //     if (tokensToDelete.length) await this.#db.tokens.bulkDelete(tokensToDelete)
    //     // add all except ones matching custom existing ones (user may customize built-in tokens)
    //     const customTokenIds = (await this.#db.tokens.toArray()).map((token) => token.id)
    //     const newTokens = tokens.filter((token) => {
    //       // don't replace custom tokens
    //       if (customTokenIds.includes(token.id)) return false
    //       if (deleteChains === undefined) return true
    //       if (!token.networkId) return true
    //       if (deleteChains.has(token.networkId)) return true
    //       return false
    //     })
    //     await this.#db.tokens.bulkPut(newTokens)
    //   })
    //   this.#lastHydratedTokensAt = now
    //   return true
    // } catch (error) {
    //   log.warn(`Failed to hydrate tokens from chaindata`, error)
    //   return false
    // }
  }

  async getIsBuiltInChain(_chainId: ChainId) {
    throw new Error("Not implemented")
    // const chain = await fetchChain(chainId)
    // return !!chain
  }

  async getIsBuiltInEvmNetwork(_evmNetworkId: EvmNetworkId) {
    throw new Error("Not implemented")
    // try {
    //   const evmNetwork = await fetchEvmNetwork(evmNetworkId)
    //   return !!evmNetwork
    // } catch (e) {
    //   return false
    // }
  }

  // async transaction<U>(
  //   mode: TransactionMode,
  //   tables: string[],
  //   scope: (trans: Transaction) => PromiseLike<U> | U,
  // ): Promise<U> {
  //   return await this.#db.transaction(mode, tables, scope)
  // }
}
