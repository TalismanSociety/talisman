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
  getChain(chainId: ChainId): Promise<Chain | CustomChain | null>
  getChainByGenesisHash(genesisHash: `0x${string}`): Promise<Chain | CustomChain | null>
}

export interface ChaindataEvmNetworkProvider {
  evmNetworkIds(): Promise<EvmNetworkId[]>
  evmNetworks(): Promise<EvmNetworkList>
  getEvmNetwork(evmNetworkId: EvmNetworkId): Promise<EvmNetwork | CustomEvmNetwork | null>
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
