import {
  Chain,
  ChainId,
  ChainList,
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
  getChain(chainId: ChainId): Promise<Chain | null>
}

export interface ChaindataEvmNetworkProvider {
  evmNetworkIds(): Promise<EvmNetworkId[]>
  evmNetworks(): Promise<EvmNetworkList>
  getEvmNetwork(evmNetworkId: EvmNetworkId): Promise<EvmNetwork | null>
}

export interface ChaindataTokenProvider {
  tokenIds(): Promise<TokenId[]>
  tokens(): Promise<TokenList>
  getToken(tokenId: TokenId): Promise<Token | null>
}

export interface ChaindataProvider
  extends ChaindataChainProvider,
    ChaindataEvmNetworkProvider,
    ChaindataTokenProvider {}
