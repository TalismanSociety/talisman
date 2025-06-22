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
import z from "zod/v4"

import {
  DotNetwork,
  isNetworkOfPlatform,
  Network,
  NetworkId,
  NetworkOfPlatform,
  NetworkPlatform,
  NetworkSchema,
  Token,
  TokenId,
  TokenOfType,
  TokenSchema,
  TokenType,
} from "./chaindata"
import log from "./log"
import {
  Chaindata,
  ChaindataFileSchema,
  CustomChaindata,
  CustomChaindataSchema,
  defaultChaindata$,
} from "./state"
import { IChaindataProvider } from "./types"
import * as util from "./util"

export type ChaindataProviderOptions = {
  customChaindata$?: Observable<CustomChaindata> | CustomChaindata
}

export class ChaindataProvider implements IChaindataProvider {
  #chaindata$: Observable<Chaindata>

  constructor(options?: ChaindataProviderOptions) {
    this.#chaindata$ = getCombinedChaindata(defaultChaindata$, options?.customChaindata$)
  }

  /**
   * Mini metadatas
   */

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

  /**
   * Tokens
   */

  get tokens$() {
    return this.#chaindata$.pipe(
      distinctUntilKeyChanged("tokens", isEqual),
      map(({ tokens }) => tokens),
      shareReplay({ bufferSize: 1, refCount: true }),
    )
  }

  getTokens$<
    T extends TokenType | undefined,
    R extends T extends TokenType ? TokenOfType<T> : Token,
  >(type?: T): Observable<R[]> {
    return this.tokens$.pipe(map(util.filterTokensByType(type))) as Observable<R[]>
  }

  async getTokens<
    T extends TokenType | undefined,
    R extends T extends TokenType ? TokenOfType<T> : Token,
  >(type?: T): Promise<R[]> {
    return (await util.wrapObservableWithGetter(
      "Failed to get tokens",
      this.getTokens$(type),
    )) as R[]
  }

  getTokenIds$(type?: TokenType) {
    return this.getTokens$(type).pipe(map(util.itemsToIds))
  }
  async getTokenIds(type?: TokenType) {
    return await util.wrapObservableWithGetter("Failed to get tokenIds", this.getTokenIds$(type))
  }

  getTokensMapById$<
    T extends TokenType | undefined,
    R extends T extends TokenType ? TokenOfType<T> : Token,
  >(type?: T): Observable<Record<TokenId, R>> {
    return this.getTokens$(type).pipe(map(util.itemsToMapById)) as Observable<Record<TokenId, R>>
  }
  async getTokensMapById<
    T extends TokenType | undefined,
    R extends T extends TokenType ? TokenOfType<T> : Token,
  >(type?: T): Promise<Record<TokenId, R>> {
    return (await util.wrapObservableWithGetter(
      "Failed to get tokens map by id",
      this.getTokensMapById$(type),
    )) as Record<TokenId, R>
  }

  getTokenById$<
    T extends TokenType | undefined,
    R extends T extends TokenType ? TokenOfType<T> : Token,
  >(id: TokenId, type?: T): Observable<R | null> {
    return this.getTokensMapById$(type).pipe(
      map((tokens) => tokens[id] ?? null),
    ) as Observable<R | null>
  }
  async getTokenById<
    T extends TokenType | undefined,
    R extends T extends TokenType ? TokenOfType<T> : Token,
  >(id: TokenId, type?: T): Promise<R | null> {
    return (await util.withErrorReason(
      "Failed to get token by id",
      async () => await this.getTokenById(id, type),
    )) as R | null
  }

  /**
   * Networks
   */

  get networks$() {
    return this.#chaindata$.pipe(
      distinctUntilKeyChanged("networks", isEqual),
      map(({ networks }) => networks),
      shareReplay({ bufferSize: 1, refCount: true }),
    )
  }

  networksObservable<
    P extends NetworkPlatform | undefined,
    N = P extends NetworkPlatform ? NetworkOfPlatform<P> : Network,
  >(platform?: P): Observable<N[]> {
    return this.networks$.pipe(map(util.filterNetworksByPlatform(platform))) as Observable<N[]>
  }
  async networks<
    P extends NetworkPlatform | undefined,
    N = P extends NetworkPlatform ? NetworkOfPlatform<P> : Network,
  >(platform?: P): Promise<N[]> {
    return (await util.wrapObservableWithGetter(
      "Failed to get networks",
      this.networksObservable(platform),
    )) as N[]
  }

  networkIdsObservable(platform?: NetworkPlatform) {
    return this.networksObservable(platform).pipe(map(util.itemsToIds))
  }
  async networkIds(platform?: NetworkPlatform) {
    return await util.wrapObservableWithGetter(
      "Failed to get networkIds",
      this.networkIdsObservable(platform),
    )
  }

  networksByIdObservable<
    P extends NetworkPlatform | undefined,
    N = P extends NetworkPlatform ? NetworkOfPlatform<P> : Network,
  >(platform?: P) {
    return this.networksObservable(platform).pipe(map(util.itemsToMapById)) as Observable<
      Record<NetworkId, N>
    >
  }
  async networksById<
    P extends NetworkPlatform | undefined,
    N = P extends NetworkPlatform ? NetworkOfPlatform<P> : Network,
  >(platform?: P): Promise<Record<NetworkId, N>> {
    return (await util.wrapObservableWithGetter(
      "Failed to get networks by id",
      this.networksByIdObservable(platform),
    )) as Record<NetworkId, N>
  }

  get networksByGenesisHashObservable() {
    return this.networksObservable("polkadot").pipe(map(util.itemsToMapByGenesisHash))
  }
  async networksByGenesisHash() {
    return await util.wrapObservableWithGetter(
      "Failed to get networks by genesisHash",
      this.networksByGenesisHashObservable,
    )
  }

  async networkById<
    P extends NetworkPlatform | undefined,
    Res = P extends NetworkPlatform ? NetworkOfPlatform<P> : Network,
  >(networkId: NetworkId, platform?: P): Promise<Res | null> {
    return await util.withErrorReason("Failed to get evmNetwork by id", async () => {
      const networksList = await this.networksById()
      const network = networksList[networkId]
      return !platform || isNetworkOfPlatform(network, platform) ? (network as Res) : null
    })
  }

  async networkByGenesisHash(genesisHash: `0x${string}`) {
    return await util.withErrorReason(
      "Failed to get network by genesisHash",
      async (): Promise<DotNetwork | null> =>
        (await this.networksByGenesisHash())[genesisHash] ?? null,
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
  return combineLatest({ defaultData: default$, customData: customChaindata$ }).pipe(
    map((data) => ChaindataProviderDataSchema.parse(data) as Chaindata),
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

/**
 * ⚠️ Hack ⚠️
 * Because Token and Network schemas are unions, zod doesn't allow extending them
 * ChaindataProvider needs to merge default and custom entities, and it turns out that doing it via a zod schema generates the correct output types.
 * So let's take the opportunity and generate the helpper functions we need to leverage those properties
 *
 * Note: ChaindataProvider's consolidated output is the only context where we can safely derive isCustom and isTestnet properties.
 * So these properties should not be declared on the main Token & Network schemas.
 */
const ChaindataProviderDataSchema = z
  .strictObject({
    defaultData: ChaindataFileSchema,
    customData: CustomChaindataSchema,
  })
  .transform(({ defaultData, customData }) => {
    const defaultNetworksById = keyBy(
      defaultData.networks.map((n) => ({ ...n, _isCustom: false })),
      (n) => n.id,
    )
    const customNetworksById = keyBy(
      customData.networks?.map((n) => ({ ...n, _isCustom: true })),
      (n) => n.id,
    )
    const networksById = assign({}, defaultNetworksById, customNetworksById)

    const defaultTokensById = keyBy(
      defaultData.tokens.map((n) => ({
        ...n,
        _isCustom: false,
        _isTestnet: !!networksById[n.networkId]?.isTestnet,
      })),
      (n) => n.id,
    )
    const customTokensById = keyBy(
      customData.tokens.map((n) => ({
        ...n,
        _isCustom: true,
        _isTestnet: !!networksById[n.networkId]?.isTestnet,
      })),
      (n) => n.id,
    )
    const tokensById = assign({}, defaultTokensById, customTokensById)

    return {
      networks: values(networksById),
      tokens: values(tokensById),
      miniMetadatas: defaultData.miniMetadatas,
    }
  })

// these types shouldnt be exported, we only leverage them to generate the helper functions
type ChaindataProviderData = z.infer<typeof ChaindataProviderDataSchema>
type ChaindataProviderNetwork = ChaindataProviderData["networks"][number]
type ChaindataProviderToken = ChaindataProviderData["tokens"][number]

export const isNetworkCustom = (network: Network): boolean => {
  if (typeof network !== "object") return false
  const { _isCustom, ...rest } = network as ChaindataProviderNetwork
  return _isCustom && NetworkSchema.safeParse(rest).success
}

export const isTokenCustom = (token: Token): boolean => {
  if (typeof token !== "object") return false
  const { _isCustom, ...rest } = token as ChaindataProviderToken
  return _isCustom && TokenSchema.safeParse(rest).success
}

export const isTokenTestnet = (token: Token): boolean => {
  if (typeof token !== "object") return false
  const { _isTestnet, ...rest } = token as ChaindataProviderToken
  return _isTestnet && TokenSchema.safeParse(rest).success
}
