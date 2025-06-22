import { Network } from "./networks"
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

export const isTokenOfPlatform = <P extends Network["platform"]>(
  token: Token | null | undefined,
  platform: P,
): token is Extract<Token, { platform: P }> => {
  return !!token && token.platform === platform
}

export const isTokenEth = (token: Token | null | undefined) => {
  return isTokenOfPlatform(token, "ethereum")
}

export const isTokenDot = (token: Token | null | undefined) => {
  return isTokenOfPlatform(token, "polkadot")
}

export const isNetworkOfPlatform = <P extends Network["platform"]>(
  network: Network | null | undefined,
  platform: P,
): network is Extract<Network, { platform: P }> => {
  return !!network && network.platform === platform
}

export const isNetworkDot = (network: Network | null | undefined) => {
  return isNetworkOfPlatform(network, "polkadot")
}

export const isNetworkEth = (network: Network | null | undefined) => {
  return isNetworkOfPlatform(network, "ethereum")
}

export const isTokenOfType = <T extends TokenType>(
  token: Token | null | undefined,
  type: T,
): token is Extract<Token, { type: T }> => {
  return !!token && token.type === type
}

export const isTokenSubNative = (token: Token | null | undefined) => {
  return isTokenOfType(token, "substrate-native")
}

export const isTokenSubAssets = (token: Token | null | undefined) => {
  return isTokenOfType(token, "substrate-assets")
}

export const isTokenSubForeignAssets = (token: Token | null | undefined) => {
  return isTokenOfType(token, "substrate-foreignassets")
}

export const isTokenSubPsp22 = (token: Token | null | undefined) => {
  return isTokenOfType(token, "substrate-psp22")
}

export const isTokenSubTokens = (token: Token | null | undefined) => {
  return isTokenOfType(token, "substrate-tokens")
}

export const isTokenEvmNative = (token: Token | null | undefined) => {
  return isTokenOfType(token, "evm-native")
}

export const isTokenEvmErc20 = (token: Token | null | undefined) => {
  return isTokenOfType(token, "evm-erc20")
}

export const isTokenEvmUniswapV2 = (token: Token | null | undefined) => {
  return isTokenOfType(token, "evm-uniswapv2")
}

export const getNetworkGenesisHash = (
  network: Network | null | undefined,
): `0x${string}` | undefined => {
  return isNetworkDot(network) ? network.genesisHash : undefined
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
