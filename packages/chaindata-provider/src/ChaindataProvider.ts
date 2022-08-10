import { Chain, ChainId, EvmNetwork, EvmNetworkId, Token, TokenId } from "./types"

export interface ChaindataChainProvider {
  getChain(chainId: ChainId): Promise<Chain | null>
}

export interface ChaindataEvmNetworkProvider {
  getEvmNetwork(evmNetworkId: EvmNetworkId): Promise<EvmNetwork | null>
}

export interface ChaindataTokenProvider {
  getToken(tokenId: TokenId): Promise<Token | null>
}

export interface ChaindataProvider
  extends ChaindataChainProvider,
    ChaindataEvmNetworkProvider,
    ChaindataTokenProvider {}
