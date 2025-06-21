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
  DotNetwork,
  EthNetwork,
  isDotNetwork,
  isEthNetwork,
  Network,
  Token,
  TokenId,
} from "./chaindata"
import log from "./log"
import { Chaindata, CustomChaindata, CustomChaindataSchema, defaultChaindata$ } from "./state"
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
}

const DEFAULT_CUSTOM_CHAINDATA: CustomChaindata = { networks: [], tokens: [] }

const getCombinedChaindata = (
  default$: Observable<Chaindata>,
  custom$: Observable<CustomChaindata> | CustomChaindata | undefined,
): Observable<Chaindata> => {
  // ensure custom$ is an observable
  if (!custom$) custom$ = of(DEFAULT_CUSTOM_CHAINDATA)
  if (!isObservable(custom$)) custom$ = of(custom$)

  // check custom one against schema
  const customChaindata$ = (custom$ ?? of(DEFAULT_CUSTOM_CHAINDATA)).pipe(
    distinctUntilChanged(isEqual),
    map((data) => {
      const result = CustomChaindataSchema.safeParse(data)
      if (!result.success) log.error("Invalid custom chaindata provided", result.error)
      return result.success ? result.data : DEFAULT_CUSTOM_CHAINDATA
    }),
  )

  // merge custom into default
  return combineLatest([default$, customChaindata$]).pipe(
    map(([defaultData, customData]) => ({
      ...defaultData,
      networks: customData.networks?.length
        ? values(
            assign(
              keyBy(defaultData.networks, (n) => n.id),
              keyBy(
                customData.networks?.map((n) => ({ ...n, isCustom: true })),
                (n) => n.id,
              ),
            ),
          )
        : defaultData.networks,
      tokens: customData.tokens.length
        ? values(
            assign(
              keyBy(defaultData.tokens, (t) => t.id),
              keyBy(
                customData.tokens.map((n) => ({ ...n, isCustom: true })),
                (t) => t.id,
              ),
            ),
          )
        : defaultData.tokens,
    })),
    // integrity checks
    map((chaindata) => {
      const tokensById = keyBy(chaindata.tokens, (t) => t.id)

      // because of customChaindata, it's theorically possible that some network end up without a native token
      // in that case, it network should be filtered out
      const networks = chaindata.networks.filter((n) => {
        if (tokensById[n.nativeTokenId]) return true
        log.warn(`Network ${n.id} (${n.name}) has no native token with id ${n.nativeTokenId}`)
        return false
      })

      return { ...chaindata, networks }
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  )
}
