import { Observable } from "rxjs"

import { Chain, ChainId, CustomChain } from "./Chain"
import { CustomEvmNetwork, EvmNetwork, EvmNetworkId } from "./EvmNetwork"
import { Token, TokenId } from "./Token"

export interface IChaindataChainProvider {
  chainsObservable: Observable<Chain[]>
  chains(): Promise<Chain[]>

  customChainsObservable: Observable<CustomChain[]>
  customChains(): Promise<CustomChain[]>

  chainIdsObservable: Observable<ChainId[]>
  chainIds(): Promise<ChainId[]>

  chainsByIdObservable: Observable<Record<ChainId, Chain>>
  chainsById(): Promise<Record<ChainId, Chain>>

  chainsByGenesisHashObservable: Observable<Record<ChainId, Chain>>
  chainsByGenesisHash(): Promise<Record<ChainId, Chain>>

  chainById(chainId: ChainId): Promise<Chain | null>
  chainByGenesisHash(genesisHash: `0x${string}`): Promise<Chain | null>
}

export interface IChaindataEvmNetworkProvider {
  evmNetworksObservable: Observable<EvmNetwork[]>
  evmNetworks(): Promise<EvmNetwork[]>

  customEvmNetworksObservable: Observable<CustomEvmNetwork[]>
  customEvmNetworks(): Promise<CustomEvmNetwork[]>

  evmNetworkIdsObservable: Observable<EvmNetworkId[]>
  evmNetworkIds(): Promise<EvmNetworkId[]>

  evmNetworksByIdObservable: Observable<Record<EvmNetworkId, EvmNetwork>>
  evmNetworksById(): Promise<Record<EvmNetworkId, EvmNetwork>>

  evmNetworkById(evmNetworkId: EvmNetworkId): Promise<EvmNetwork | null>
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
    IChaindataTokenProvider {}
