import {
  Chain,
  ChainId,
  ChainList,
  CustomChain,
  CustomEvmNetwork,
  EvmNetwork,
  EvmNetworkId,
  EvmNetworkList,
  Token,
  TokenId,
  TokenList,
} from "./types"

export interface ChaindataChainProvider {
  chainIds(): Promise<ChainId[]>
  chains(): Promise<ChainList>
  getChain(chainIdOrQuery: ChainId | Partial<Chain>): Promise<Chain | CustomChain | null>
}

export interface ChaindataEvmNetworkProvider {
  evmNetworkIds(): Promise<EvmNetworkId[]>
  evmNetworks(): Promise<EvmNetworkList>
  getEvmNetwork(
    evmNetworkIdOrQuery: EvmNetworkId | Partial<EvmNetwork>
  ): Promise<EvmNetwork | CustomEvmNetwork | null>
}

export interface ChaindataTokenProvider {
  tokenIds(): Promise<TokenId[]>
  tokens(): Promise<TokenList>
  getToken(tokenIdOrQuery: TokenId | Partial<Token>): Promise<Token | null>
}

export interface ChaindataProvider
  extends ChaindataChainProvider,
    ChaindataEvmNetworkProvider,
    ChaindataTokenProvider {}
