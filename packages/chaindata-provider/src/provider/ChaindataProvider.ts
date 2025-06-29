import { assign, isEqual, keyBy, values } from "lodash"
import {
  combineLatest,
  distinctUntilChanged,
  distinctUntilKeyChanged,
  firstValueFrom,
  isObservable,
  map,
  Observable,
  of,
  shareReplay,
} from "rxjs"
import z from "zod/v4"

import { IChaindataProvider } from "."
import {
  DotNetwork,
  isNetworkOfPlatform,
  isTokenOfType,
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
} from "../chaindata"
import log from "../log"
import {
  Chaindata,
  ChaindataFileSchema,
  CustomChaindata,
  CustomChaindataSchema,
  defaultChaindata$,
} from "../state"

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

  get miniMetadatas$() {
    return this.#chaindata$.pipe(
      distinctUntilKeyChanged("miniMetadatas", isEqual),
      map(({ miniMetadatas }) => miniMetadatas),
      shareReplay({ bufferSize: 1, refCount: true }),
    )
  }

  async getMiniMetadatas() {
    return await wrapObservableWithGetter("Failed to get miniMetadatas", this.miniMetadatas$)
  }

  get getMiniMetadatasMapById$() {
    return this.miniMetadatas$.pipe(map(itemsToMapById))
  }
  async getMiniMetadatasMapById() {
    return await wrapObservableWithGetter(
      "Failed to get mini metadatas by id",
      this.getMiniMetadatasMapById$,
    )
  }

  getMiniMetadataById$(id: string) {
    return this.getMiniMetadatasMapById$.pipe(map((miniMetadatas) => miniMetadatas[id] ?? null))
  }

  async miniMetadataById(id: string) {
    return await wrapObservableWithGetter(
      "Failed to get mini metadata by id",
      this.getMiniMetadataById$(id),
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
    return this.tokens$.pipe(map(filterTokensByType(type))) as Observable<R[]>
  }

  async getTokens<
    T extends TokenType | undefined,
    R extends T extends TokenType ? TokenOfType<T> : Token,
  >(type?: T): Promise<R[]> {
    return (await wrapObservableWithGetter("Failed to get tokens", this.getTokens$(type))) as R[]
  }

  getTokenIds$(type?: TokenType) {
    return this.getTokens$(type).pipe(map(itemsToIds))
  }
  async getTokenIds(type?: TokenType) {
    return await wrapObservableWithGetter("Failed to get tokenIds", this.getTokenIds$(type))
  }

  getTokensMapById$<
    T extends TokenType | undefined,
    R extends T extends TokenType ? TokenOfType<T> : Token,
  >(type?: T): Observable<Record<TokenId, R>> {
    return this.getTokens$(type).pipe(map(itemsToMapById)) as Observable<Record<TokenId, R>>
  }
  async getTokensMapById<
    T extends TokenType | undefined,
    R extends T extends TokenType ? TokenOfType<T> : Token,
  >(type?: T): Promise<Record<TokenId, R>> {
    return (await wrapObservableWithGetter(
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
    return (await wrapObservableWithGetter(
      "Failed to get token by id",
      this.getTokenById$(id, type),
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

  getNetworks$<
    P extends NetworkPlatform | undefined,
    R = P extends NetworkPlatform ? NetworkOfPlatform<P> : Network,
  >(platform?: P): Observable<R[]> {
    return this.networks$.pipe(map(filterNetworksByPlatform(platform))) as Observable<R[]>
  }
  async getNetworks<
    P extends NetworkPlatform | undefined,
    R = P extends NetworkPlatform ? NetworkOfPlatform<P> : Network,
  >(platform?: P): Promise<R[]> {
    return (await wrapObservableWithGetter(
      "Failed to get networks",
      this.getNetworks$(platform),
    )) as R[]
  }

  getNetworkIds$(platform?: NetworkPlatform) {
    return this.getNetworks$(platform).pipe(map(itemsToIds))
  }
  async getNetworkIds(platform?: NetworkPlatform) {
    return await wrapObservableWithGetter("Failed to get networkIds", this.getNetworkIds$(platform))
  }

  getNetworksMapById$<
    P extends NetworkPlatform | undefined,
    R = P extends NetworkPlatform ? NetworkOfPlatform<P> : Network,
  >(platform?: P) {
    return this.getNetworks$(platform).pipe(map(itemsToMapById)) as Observable<Record<NetworkId, R>>
  }
  async getNetworksMapById<
    P extends NetworkPlatform | undefined,
    R = P extends NetworkPlatform ? NetworkOfPlatform<P> : Network,
  >(platform?: P): Promise<Record<NetworkId, R>> {
    return (await wrapObservableWithGetter(
      "Failed to get networks by id",
      this.getNetworksMapById$(platform),
    )) as Record<NetworkId, R>
  }

  getNetworksMapByGenesisHash$(): Observable<Record<`0x${string}`, DotNetwork>> {
    return this.getNetworks$("polkadot").pipe(map(itemsToMapByGenesisHash))
  }
  async getNetworksMapByGenesisHash() {
    return await wrapObservableWithGetter(
      "Failed to get networks by genesisHash",
      this.getNetworksMapByGenesisHash$(),
    )
  }

  getNetworkById$<
    P extends NetworkPlatform | undefined,
    R = P extends NetworkPlatform ? NetworkOfPlatform<P> : Network,
  >(networkId: NetworkId, platform?: P): Observable<R | null> {
    return this.getNetworksMapById$(platform).pipe(
      map((networksById) => networksById[networkId] ?? null),
    ) as Observable<R | null>
  }

  async getNetworkById<
    P extends NetworkPlatform | undefined,
    R = P extends NetworkPlatform ? NetworkOfPlatform<P> : Network,
  >(networkId: NetworkId, platform?: P): Promise<R | null> {
    return (await wrapObservableWithGetter(
      "Failed to get network by id",
      this.getNetworkById$(networkId, platform),
    )) as R | null
  }

  getNetworkByGenesisHash$(genesisHash: `0x${string}`) {
    return this.getNetworksMapByGenesisHash$().pipe(
      map((networksByGenesisHash) => networksByGenesisHash[genesisHash] ?? null),
    )
  }
  async getNetworkByGenesisHash(genesisHash: `0x${string}`) {
    return await wrapObservableWithGetter(
      "Failed to get network by genesisHash",
      this.getNetworkByGenesisHash$(genesisHash),
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
    map((data) => {
      const start = performance.now()
      const parsed = ChaindataProviderDataSchema.safeParse(data)
      log.debug(
        "[ChaindataProvider] Combined chaindata schema validation: %sms",
        (performance.now() - start).toFixed(2),
      )
      if (!parsed.success) {
        log.error("Failed to parse chaindata provider data", { parsed, data })
        throw new Error("Failed to parse chaindata provider data")
      }
      return parsed.data as Chaindata
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
      defaultData.networks.map((n) => ({ ...n, __isKnown: true, __isCustom: false })),
      (n) => n.id,
    )
    const customNetworksById = keyBy(
      customData.networks?.map((t) => ({
        ...t,
        __isKnown: !!defaultNetworksById[t.id],
        __isCustom: true,
      })),
      (n) => n.id,
    )
    const networksById = assign({}, defaultNetworksById, customNetworksById)

    const defaultTokensById = keyBy(
      defaultData.tokens.map((n) => ({
        ...n,
        __isCustom: false,
        __isKnown: true,
        __isTestnet: !!networksById[n.networkId]?.isTestnet,
      })),
      (n) => n.id,
    )
    const customTokensById = keyBy(
      customData.tokens.map((t) => ({
        ...t,
        __isCustom: true,
        __isKnown: !!defaultTokensById[t.id],
        __isTestnet: !!networksById[t.networkId]?.isTestnet,
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
  const { __isCustom, __isKnown, ...rest } = network as ChaindataProviderNetwork
  return __isCustom && NetworkSchema.safeParse(rest).success
}

export const isNetworkKnown = (network: Network): boolean => {
  if (typeof network !== "object") return false
  const { __isCustom, __isKnown, ...rest } = network as ChaindataProviderNetwork
  return __isKnown && NetworkSchema.safeParse(rest).success
}

export const isTokenCustom = (token: Token): boolean => {
  if (typeof token !== "object") return false
  const { __isCustom, __isKnown, __isTestnet, ...rest } = token as ChaindataProviderToken
  return __isCustom && TokenSchema.safeParse(rest).success
}

export const isTokenKnown = (token: Token): boolean => {
  if (typeof token !== "object") return false
  const { __isCustom, __isKnown, __isTestnet, ...rest } = token as ChaindataProviderToken
  return __isKnown && TokenSchema.safeParse(rest).success
}

export const isTokenTestnet = (token: Token): boolean => {
  if (typeof token !== "object") return false
  const { __isCustom, __isKnown, __isTestnet, ...rest } = token as ChaindataProviderToken
  return __isTestnet && TokenSchema.safeParse(rest).success
}

export const getCleanNetwork = (network: Network): Network => {
  const { __isCustom, __isKnown, ...rest } = network as ChaindataProviderNetwork
  return rest as Network
}

export const getCleanToken = (token: Token): Token => {
  const { __isCustom, __isKnown, __isTestnet, ...rest } = token as ChaindataProviderToken
  return rest as Token
}

//
// map from Item[] to another type
//

const itemsToIds = <T extends { id: string }>(items: T[]): string[] => items.map(({ id }) => id)

const itemsToMapById = <T extends { id: string }>(items: T[]): Record<string, T> =>
  Object.fromEntries(items.map((item) => [item.id, item]))

const itemsToMapByGenesisHash = <T extends { genesisHash: `0x${string}` | null }>(
  items: T[],
): Record<`0x${string}`, T> =>
  Object.fromEntries(items.flatMap((item) => (item.genesisHash ? [[item.genesisHash, item]] : [])))

const filterTokensByType =
  <T extends TokenType | undefined, Res extends T extends TokenType ? TokenOfType<T>[] : Token[]>(
    type: T,
  ) =>
  (tokens: Token[]): Res =>
    tokens.filter((token) => !type || isTokenOfType(token, type)) as Res

const filterNetworksByPlatform =
  <
    P extends NetworkPlatform | undefined,
    Res extends P extends NetworkPlatform ? NetworkOfPlatform<P>[] : Network[],
  >(
    platform: P,
  ) =>
  (networks: Network[]): Res =>
    networks.filter((network) => !platform || isNetworkOfPlatform(network, platform)) as Res

//
// Utils to wrap Observable methods with one-shot Promise methods
//

type ObservableReturnType<O> = O extends Observable<infer T> ? T : O

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wrapObservableWithGetter = async <O extends Observable<any>>(
  errorReason: string,
  observable: O,
): Promise<ObservableReturnType<O>> => {
  return await withErrorReason(errorReason, () => firstValueFrom(observable))
}

const withErrorReason = async <T>(reason: string, task: () => Promise<T> | T): Promise<T> => {
  try {
    return await task()
  } catch (cause) {
    throw new Error(reason, { cause })
  }
}
