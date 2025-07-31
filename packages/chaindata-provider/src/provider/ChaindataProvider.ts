import { isSubject } from "@talismn/util"
import { isEqual } from "lodash-es"
import {
  distinctUntilKeyChanged,
  firstValueFrom,
  map,
  Observable,
  ReplaySubject,
  shareReplay,
  Subject,
} from "rxjs"

import {
  AnyMiniMetadata,
  DotNetwork,
  isNetworkOfPlatform,
  isTokenOfType,
  Network,
  NetworkId,
  NetworkOfPlatform,
  NetworkPlatform,
  Token,
  TokenId,
  TokenOfType,
  TokenType,
} from "../chaindata"
import { getCombinedChaindata$ } from "../state/combinedChaindata"
import { getDefaultChaindata$ } from "../state/defaultChaindata"
import { tryToDeleteOldChaindataDb } from "../state/oldDb"
import { Chaindata, CustomChaindata } from "../state/schema"
import { IChaindataProvider } from "./ChaindataProviderInterface"

/**
 * This type will be used for in-memory storage of chaindata.
 *
 * Provide a Subject<ChaindataStorage> and subscribe to changes to persist the data to disk.
 * Instantiate ChaindataProvider with this subject to restore persisted data from disk.
 */
export type ChaindataStorage = {
  networks: Network[]
  tokens: Token[]
  miniMetadatas: AnyMiniMetadata[]
}

/** By default, chaindata will be stored in memory and not persisted. */
const DEFAULT_STORAGE: ChaindataStorage = {
  networks: [],
  tokens: [],
  miniMetadatas: [],
}

export type ChaindataProviderOptions = {
  storage$?: Subject<ChaindataStorage> | ChaindataStorage
  customChaindata$?: Observable<CustomChaindata> | CustomChaindata
}

export class ChaindataProvider implements IChaindataProvider {
  #chaindata$: Observable<Chaindata>

  constructor({ storage$: storage, customChaindata$ }: ChaindataProviderOptions = {}) {
    tryToDeleteOldChaindataDb()

    const storage$ = isSubject(storage) ? storage : replaySubjectFrom(storage ?? DEFAULT_STORAGE)
    const defaultChaindata$ = getDefaultChaindata$(storage$)
    this.#chaindata$ = getCombinedChaindata$(defaultChaindata$, customChaindata$)
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

  get miniMetadatasMapById$() {
    return this.miniMetadatas$.pipe(
      map(itemsToMapById),
      shareReplay({ bufferSize: 1, refCount: true }),
    )
  }
  async getMiniMetadatasMapById() {
    return await wrapObservableWithGetter(
      "Failed to get mini metadatas by id",
      this.miniMetadatasMapById$,
    )
  }

  getMiniMetadataById$(id: string) {
    return this.miniMetadatasMapById$.pipe(map((miniMetadatas) => miniMetadatas[id] ?? null))
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

const replaySubjectFrom = <T>(initialValue: T): ReplaySubject<T> => {
  if (initialValue instanceof ReplaySubject) return initialValue

  const subject = new ReplaySubject<T>(1)
  subject.next(initialValue)
  return subject
}
