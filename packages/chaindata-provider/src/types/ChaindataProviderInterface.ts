import { Observable } from "rxjs"

import { DotNetwork, EthNetwork, Network, NetworkId, Token, TokenId } from "../chaindata"
import { ChainId } from "./Chain"
import { EvmNetworkId } from "./EvmNetwork"

export interface IChaindataChainProvider {
  chainsObservable: Observable<DotNetwork[]>
  chains(): Promise<DotNetwork[]>

  customChainsObservable: Observable<DotNetwork[]>
  customChains(): Promise<DotNetwork[]>

  chainIdsObservable: Observable<ChainId[]>
  chainIds(): Promise<ChainId[]>

  chainsByIdObservable: Observable<Record<ChainId, DotNetwork>>
  chainsById(): Promise<Record<ChainId, DotNetwork>>

  chainsByGenesisHashObservable: Observable<Record<ChainId, DotNetwork>>
  chainsByGenesisHash(): Promise<Record<ChainId, DotNetwork>>

  chainById(chainId: ChainId): Promise<DotNetwork | null>
  chainByGenesisHash(genesisHash: `0x${string}`): Promise<DotNetwork | null>
}

export interface IChaindataEvmNetworkProvider {
  evmNetworksObservable: Observable<EthNetwork[]>
  evmNetworks(): Promise<EthNetwork[]>

  customEvmNetworksObservable: Observable<EthNetwork[]>
  customEvmNetworks(): Promise<EthNetwork[]>

  evmNetworkIdsObservable: Observable<EvmNetworkId[]>
  evmNetworkIds(): Promise<EvmNetworkId[]>

  evmNetworksByIdObservable: Observable<Record<EvmNetworkId, EthNetwork>>
  evmNetworksById(): Promise<Record<EvmNetworkId, EthNetwork>>

  evmNetworkById(evmNetworkId: EvmNetworkId): Promise<EthNetwork | null>
}

export interface IChaindataNetworkProvider {
  networksObservable: Observable<Network[]>
  networks(): Promise<Network[]>

  customNetworksObservable: Observable<Network[]>
  customNetworks(): Promise<Network[]>

  networkIdsObservable: Observable<NetworkId[]>
  networkIds(): Promise<NetworkId[]>

  networksByIdObservable: Observable<Record<NetworkId, Network>>
  networksById(): Promise<Record<NetworkId, Network>>

  networksByGenesisHashObservable: Observable<Record<`0x${string}`, DotNetwork>>
  networksByGenesisHash(): Promise<Record<`0x${string}`, DotNetwork>>

  networkById(networkId: NetworkId): Promise<Network | null>
  networkByGenesisHash(genesisHash: `0x${string}`): Promise<DotNetwork | null>
}

export interface IChaindataTokenProvider {
  tokensObservable: Observable<Token[]>
  tokens(): Promise<Token[]>

  customTokensObservable: Observable<Token[]>
  customTokens(): Promise<Token[]>

  tokenIdsObservable: Observable<TokenId[]>
  tokenIds(): Promise<TokenId[]>

  tokensByIdObservable: Observable<Record<TokenId, Token>>
  tokensById(): Promise<Record<TokenId, Token>>

  tokenById(tokenId: TokenId): Promise<Token | null>
}

export interface IChaindataProvider
  extends IChaindataChainProvider,
    IChaindataEvmNetworkProvider,
    IChaindataNetworkProvider,
    IChaindataTokenProvider {}
