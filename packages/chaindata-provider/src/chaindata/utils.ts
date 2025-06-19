import { DotNetwork, EthNetwork, Network } from "./networks"
import {
  parseEvmErc20TokenId,
  parseEvmNativeTokenId,
  parseEvmUniswapV2TokenId,
  parseSubAssetTokenId,
  parseSubForeignAssetTokenId,
  parseSubNativeTokenId,
  parseSubPsp22TokenId,
  parseSubTokensTokenId,
  Token,
  TokenId,
  TokenIdSpecs,
  TokenType,
} from "./tokens"

export type DotToken = Extract<Token, { platform: "polkadot" }>
export type EthToken = Extract<Token, { platform: "ethereum" }>

export const isDotToken = (token: Token | null | undefined): token is DotToken => {
  return !!token && token.platform === "polkadot"
}

export const isEthToken = (token: Token | null | undefined): token is EthToken => {
  return !!token && token.platform === "ethereum"
}

export const isDotNetwork = (network: Network | null | undefined): network is DotNetwork => {
  return !!network && network.platform === "polkadot"
}

export const isEthNetwork = (network: Network | null | undefined): network is EthNetwork => {
  return !!network && network.platform === "ethereum"
}

export const getNetworkGenesisHash = (
  network: Network | null | undefined,
): `0x${string}` | undefined => {
  return isDotNetwork(network) ? network.genesisHash : undefined
}

export const parseTokenId = <T extends TokenType>(tokenId: TokenId): TokenIdSpecs<T> => {
  const parts = tokenId.split(":")
  if (parts.length < 2) throw new Error(`Invalid TokenId: ${tokenId}`)

  const type = parts[1] as TokenType

  switch (type) {
    case "evm-native":
      return parseEvmNativeTokenId(tokenId) as TokenIdSpecs<T>
    case "evm-erc20":
      return parseEvmErc20TokenId(tokenId) as TokenIdSpecs<T>
    case "evm-uniswapv2":
      return parseEvmUniswapV2TokenId(tokenId) as TokenIdSpecs<T>
    case "substrate-native":
      return parseSubNativeTokenId(tokenId) as TokenIdSpecs<T>
    case "substrate-psp22":
      return parseSubPsp22TokenId(tokenId) as TokenIdSpecs<T>
    case "substrate-assets":
      return parseSubAssetTokenId(tokenId) as TokenIdSpecs<T>
    case "substrate-foreignassets":
      return parseSubForeignAssetTokenId(tokenId) as TokenIdSpecs<T>
    case "substrate-tokens":
      return parseSubTokensTokenId(tokenId) as TokenIdSpecs<T>
  }
}

export const networkIdFromTokenId = (tokenId: TokenId): Network["id"] =>
  parseTokenId(tokenId).networkId
