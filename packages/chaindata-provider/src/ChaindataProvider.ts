import { assign, isEqual, keyBy, values } from "lodash"
import {
  combineLatest,
  distinctUntilChanged,
  distinctUntilKeyChanged,
  isObservable,
  map,
  Observable,
  of,
  shareReplay,
} from "rxjs"

import {
  CustomChaindata,
  CustomChaindataSchema,
  DotNetwork,
  EthNetwork,
  isDotNetwork,
  isEthNetwork,
  Network,
  Token,
  TokenId,
} from "./chaindata"
import log from "./log"
import { Chaindata, defaultChaindata$ } from "./state"
import { ChainId, EvmNetworkId, IChaindataProvider } from "./types"
import * as util from "./util"

export type ChaindataProviderOptions = {
  customChaindata$?: Observable<CustomChaindata> | CustomChaindata
}

export class ChaindataProvider implements IChaindataProvider {
  #chaindata$: Observable<Chaindata>

  constructor(options?: ChaindataProviderOptions) {
    this.#chaindata$ = getCombinedChaindata(defaultChaindata$, options?.customChaindata$)
  }

  get miniMetadatasObservable() {
    return this.#chaindata$.pipe(
      distinctUntilKeyChanged("miniMetadatas", isEqual),
      map(({ miniMetadatas }) => miniMetadatas),
      shareReplay({ bufferSize: 1, refCount: true }),
    )
  }

  async miniMetadatas() {
    return await util.wrapObservableWithGetter(
      "Failed to get miniMetadatas",
      this.miniMetadatasObservable,
    )
  }

  get miniMetadatasByIdObservable() {
    return this.miniMetadatasObservable.pipe(map(util.itemsToMapById))
  }
  async miniMetadatasById() {
    return await util.wrapObservableWithGetter(
      "Failed to get mini metadatas by id",
      this.miniMetadatasByIdObservable,
    )
  }

  async miniMetadataById(id: string) {
    return await util.withErrorReason(
      "Failed to get mini metadata by id",
      async () => (await this.miniMetadatasById())[id] ?? null,
    )
  }

  //
  // base items
  //

  get chainsObservable() {
    return this.#chaindata$.pipe(
      map(({ networks }) => networks.filter(isDotNetwork)),
      shareReplay({ bufferSize: 1, refCount: true }),
    )
  }
  async chains() {
    return await util.wrapObservableWithGetter("Failed to get chains", this.chainsObservable)
  }

  get evmNetworksObservable() {
    return this.#chaindata$.pipe(
      map(({ networks }) => networks.filter(isEthNetwork)),
      shareReplay({ bufferSize: 1, refCount: true }),
    )
  }
  async evmNetworks() {
    return await util.wrapObservableWithGetter(
      "Failed to get evmNetworks",
      this.evmNetworksObservable,
    )
  }

  get networksObservable() {
    return this.#chaindata$.pipe(
      distinctUntilKeyChanged("networks", isEqual),
      map(({ networks }) => networks),
      shareReplay({ bufferSize: 1, refCount: true }),
    )
  }
  async networks() {
    return await util.wrapObservableWithGetter("Failed to get networks", this.networksObservable)
  }

  get tokensObservable() {
    return this.#chaindata$.pipe(
      distinctUntilKeyChanged("tokens", isEqual),
      map(({ tokens }) => tokens),
      shareReplay({ bufferSize: 1, refCount: true }),
    )
  }
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

  // async addCustomChain(_customChain: CustomChain) {
  //   throw new Error("Not implemented")
  //   // try {
  //   //   if (!("isCustom" in customChain && customChain.isCustom)) return
  //   //   return await this.#db.chains.put(customChain)
  //   // } catch (cause) {
  //   //   throw new Error("Failed to add custom chain", { cause })
  //   // }
  // }

  // async removeCustomChain(_chainId: ChainId) {
  //   throw new Error("Not implemented")
  //   // try {
  //   //   return await this.#db.chains
  //   //     // only affect custom chains
  //   //     .filter((chain) => "isCustom" in chain && chain.isCustom)
  //   //     // only affect the provided chainId
  //   //     .filter((chain) => chain.id === chainId)
  //   //     // delete the chain (if exists)
  //   //     .delete()
  //   // } catch (cause) {
  //   //   throw new Error("Failed to remove custom chain", { cause })
  //   // }
  // }

  // async setCustomChains(_chains: CustomChain[]) {
  //   throw new Error("Not implemented")
  //   // return await this.#db.transaction("rw", this.#db.chains, async () => {
  //   //   const keys = await this.#db.chains
  //   //     .filter((chain) => "isCustom" in chain && chain.isCustom)
  //   //     .primaryKeys()

  //   //   await this.#db.chains.bulkDelete(keys)
  //   //   await this.#db.chains.bulkPut(chains.filter((chain) => chain.isCustom))
  //   // })
  // }

  // async resetChain(_chainId: ChainId) {
  //   throw new Error("Not implemented")
  //   // const builtInChain = await fetchChain(chainId)
  //   // if (!builtInChain) throw new Error("Cannot reset non-built-in chain")
  //   // if (!builtInChain.nativeTokenId)
  //   //   throw new Error("Failed to lookup native token (no token exists for chain)")
  //   // const builtInNativeToken = await fetchSubstrateToken(builtInChain?.nativeTokenId)
  //   // if (!util.isTokenPartial(builtInNativeToken)) throw new Error("Failed to lookup native token")
  //   // if (!util.isToken(builtInNativeToken))
  //   //   throw new Error("Failed to lookup native token (isToken test failed)")

  //   // try {
  //   //   return await this.#db.transaction("rw", this.#db.chains, this.#db.tokens, async () => {
  //   //     // delete chain and its native tokens (ensures cleanup of tokens with legacy ids)
  //   //     await this.#db.tokens
  //   //       .filter((token) => token.type === "substrate-native" && token.networkId === chainId)
  //   //       .delete()
  //   //     await this.#db.chains.delete(chainId)

  //   //     // reprovision them from subsquid data
  //   //     await this.#db.chains.put(builtInChain)
  //   //     await this.#db.tokens.put(builtInNativeToken)
  //   //   })
  //   // } catch (cause) {
  //   //   throw new Error("Failed to reset chain", { cause })
  //   // }
  // }

  // async addCustomEvmNetwork(_customEvmNetwork: CustomEvmNetwork) {
  //   throw new Error("Not implemented")
  //   // try {
  //   //   if (!("isCustom" in customEvmNetwork && customEvmNetwork.isCustom)) return Promise.resolve()
  //   //   return await this.#db.evmNetworks.put(customEvmNetwork)
  //   // } catch (cause) {
  //   //   throw new Error("Failed to add custom evm network", { cause })
  //   // }
  // }

  // async removeCustomEvmNetwork(_evmNetworkId: EvmNetworkId) {
  //   // if (await this.getIsBuiltInEvmNetwork(evmNetworkId))
  //   //   throw new Error("Cannot remove built-in EVM network")
  //   // try {
  //   //   return this.#db.transaction("rw", [this.#db.evmNetworks, this.#db.tokens], async () => {
  //   //     await this.#db.evmNetworks.delete(evmNetworkId)
  //   //     await this.#db.tokens.filter((token) => token.networkId === evmNetworkId).delete()
  //   //   })
  //   // } catch (cause) {
  //   //   throw new Error("Failed to remove custom evm network", { cause })
  //   // }
  // }

  // async setCustomEvmNetworks(_networks: CustomEvmNetwork[]) {
  //   // return await this.#db.transaction("rw", this.#db.evmNetworks, async () => {
  //   //   const keys = await this.#db.evmNetworks
  //   //     .filter((network) => "isCustom" in network && network.isCustom)
  //   //     .primaryKeys()
  //   //   await this.#db.evmNetworks.bulkDelete(keys)
  //   //   await this.#db.evmNetworks.bulkPut(networks.filter((network) => network.isCustom))
  //   // })
  // }

  // async resetEvmNetwork(_evmNetworkId: EvmNetworkId) {
  //   // const builtInEvmNetwork: EvmNetwork = await fetchEvmNetwork(evmNetworkId)
  //   // if (!builtInEvmNetwork) throw new Error("Cannot reset non-built-in EVM network")
  //   // const nativeModule = builtInEvmNetwork.balancesConfig.find(
  //   //   (c: { moduleType: string }) => c.moduleType === "evm-native",
  //   // )
  //   // if (!nativeModule?.moduleConfig)
  //   //   throw new Error("Failed to lookup native token (no token exists for network)")
  //   // const { symbol, decimals, coingeckoId, logo, mirrorOf, name, noDiscovery } =
  //   //   nativeModule.moduleConfig as Token
  //   // if (!symbol) throw new Error("Missing native token symbol")
  //   // if (!decimals) throw new Error("Missing native token decimals")
  //   // const builtInNativeToken: Token = {
  //   //   id: getNativeTokenId(evmNetworkId, "evm-native"),
  //   //   type: "evm-native",
  //   //   platform: "ethereum",
  //   //   networkId: evmNetworkId,
  //   //   isTestnet: builtInEvmNetwork.isTestnet ?? false,
  //   //   isDefault: true,
  //   //   symbol,
  //   //   decimals,
  //   //   name: name ?? symbol,
  //   //   coingeckoId,
  //   //   logo,
  //   // }
  //   // if (mirrorOf) builtInNativeToken.mirrorOf = mirrorOf
  //   // if (noDiscovery) builtInNativeToken.noDiscovery = noDiscovery
  //   // builtInEvmNetwork.nativeToken = { id: builtInNativeToken.id }
  //   // try {
  //   //   return await this.#db.transaction("rw", this.#db.evmNetworks, this.#db.tokens, async () => {
  //   //     // delete chain and its native tokens (ensures cleanup of tokens with legacy ids)
  //   //     await this.#db.tokens
  //   //       .filter((token) => token.type === "evm-native" && token.networkId === evmNetworkId)
  //   //       .delete()
  //   //     const networkToDelete = await this.#db.evmNetworks.get(evmNetworkId)
  //   //     if (networkToDelete?.nativeTokenId)
  //   //       await this.#db.tokens.delete(networkToDeletenativeTokenId)
  //   //     await this.#db.evmNetworks.delete(evmNetworkId)
  //   //     // reprovision them from chaindata
  //   //     await this.#db.evmNetworks.put(builtInEvmNetwork)
  //   //     await this.#db.tokens.put(builtInNativeToken as never)
  //   //   })
  //   // } catch (cause) {
  //   //   throw new Error("Failed to reset evm network", { cause })
  //   // }
  // }
}

const DEFAULT_CUSTOM_CHAINDATA: CustomChaindata = { networks: [], tokens: [] }

const getCombinedChaindata = (
  default$: Observable<Chaindata>,
  custom$: Observable<CustomChaindata> | CustomChaindata | undefined,
) => {
  // ensure custom$ is an observable
  if (!custom$) custom$ = of(DEFAULT_CUSTOM_CHAINDATA)
  if (!isObservable(custom$)) custom$ = of(custom$)

  const customChaindata$ = (custom$ ?? of(DEFAULT_CUSTOM_CHAINDATA)).pipe(
    distinctUntilChanged(isEqual),
    map((data) => {
      const result = CustomChaindataSchema.safeParse(data)
      if (!result.success) log.error("Invalid custom chaindata provided", result.error)
      return result.success ? result.data : DEFAULT_CUSTOM_CHAINDATA
    }),
  )

  return combineLatest([default$, customChaindata$]).pipe(
    map(([defaultData, customData]) => {
      // no need to check networks, as they always come with at least the native token
      // if(!customData.tokens.length)
      //   return defaultData

      return {
        ...defaultData,
        networks: values(
          assign(
            keyBy(defaultData.networks, "id"),
            keyBy(
              customData.networks?.map((n) => ({ ...n, isCustom: true })),
              "id",
            ),
          ),
        ),
        tokens: values(
          assign(
            keyBy(defaultData.tokens, "id"),
            keyBy(
              customData.tokens.map((n) => ({ ...n, isCustom: true })),
              "id",
            ),
          ),
        ),
      }
    }),
  )
}
