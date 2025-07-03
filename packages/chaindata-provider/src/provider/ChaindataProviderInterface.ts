import { Observable } from "rxjs"

import {
  DotNetwork,
  Network,
  NetworkId,
  NetworkOfPlatform,
  NetworkPlatform,
  Token,
  TokenId,
  TokenOfType,
  TokenType,
} from "../chaindata"

export interface IChaindataNetworkProvider {
  networks$: Observable<Network[]>

  getNetworks$<
    P extends NetworkPlatform | undefined,
    R = P extends NetworkPlatform ? NetworkOfPlatform<P> : Network,
  >(
    platform?: P,
  ): Observable<R[]>
  getNetworks<
    P extends NetworkPlatform | undefined,
    R = P extends NetworkPlatform ? NetworkOfPlatform<P> : Network,
  >(
    platform?: P,
  ): Promise<R[]>

  getNetworkIds$(platform?: NetworkPlatform): Observable<NetworkId[]>
  getNetworkIds(platform?: NetworkPlatform): Promise<NetworkId[]>

  getNetworksMapById$<
    P extends NetworkPlatform | undefined,
    R = P extends NetworkPlatform ? NetworkOfPlatform<P> : Network,
  >(
    platform?: P,
  ): Observable<Record<NetworkId, R>>
  getNetworksMapById<
    P extends NetworkPlatform | undefined,
    R = P extends NetworkPlatform ? NetworkOfPlatform<P> : Network,
  >(
    platform?: P,
  ): Promise<Record<NetworkId, R>>

  getNetworksMapByGenesisHash$(): Observable<Record<`0x${string}`, DotNetwork>>
  getNetworksMapByGenesisHash(): Promise<Record<`0x${string}`, DotNetwork>>

  getNetworkById$<
    P extends NetworkPlatform | undefined,
    R = P extends NetworkPlatform ? NetworkOfPlatform<P> : Network,
  >(
    networkId: NetworkId,
    platform?: P,
  ): Observable<R | null>
  getNetworkById<
    P extends NetworkPlatform | undefined,
    R = P extends NetworkPlatform ? NetworkOfPlatform<P> : Network,
  >(
    networkId: NetworkId,
    platform?: P,
  ): Promise<R | null>

  getNetworkByGenesisHash$(genesisHash: `0x${string}`): Observable<DotNetwork | null>
  getNetworkByGenesisHash(genesisHash: `0x${string}`): Promise<DotNetwork | null>
}

export interface IChaindataTokenProvider {
  tokens$: Observable<Token[]>

  getTokens$<
    T extends TokenType | undefined,
    R extends T extends TokenType ? TokenOfType<T> : Token,
  >(
    type?: T,
  ): Observable<R[]>
  getTokens<
    T extends TokenType | undefined,
    R extends T extends TokenType ? TokenOfType<T> : Token,
  >(
    type?: T,
  ): Promise<R[]>

  getTokenIds$(type?: TokenType): Observable<TokenId[]>
  getTokenIds(type?: TokenType): Promise<TokenId[]>

  getTokensMapById$<
    T extends TokenType | undefined,
    R extends T extends TokenType ? TokenOfType<T> : Token,
  >(
    type?: T,
  ): Observable<Record<TokenId, R>>
  getTokensMapById<
    T extends TokenType | undefined,
    R extends T extends TokenType ? TokenOfType<T> : Token,
  >(
    type?: T,
  ): Promise<Record<TokenId, R>>

  getTokenById$<
    T extends TokenType | undefined,
    R extends T extends TokenType ? TokenOfType<T> : Token,
  >(
    tokenId: TokenId,
    type?: T,
  ): Observable<R | null>
  getTokenById<
    T extends TokenType | undefined,
    R extends T extends TokenType ? TokenOfType<T> : Token,
  >(
    tokenId: TokenId,
    type?: T,
  ): Promise<R | null>
}

export interface IChaindataProvider extends IChaindataNetworkProvider, IChaindataTokenProvider {}
