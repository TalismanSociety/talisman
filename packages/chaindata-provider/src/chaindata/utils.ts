import { DotNetwork, Network, NetworkPlatform } from "./networks"
import {
  EvmNativeTokenSchema,
  parseEvmErc20TokenId,
  parseEvmNativeTokenId,
  parseEvmUniswapV2TokenId,
  parseSolSplTokenId,
  parseSubAssetTokenId,
  parseSubDTaoTokenId,
  parseSubForeignAssetTokenId,
  parseSubHydrationTokenId,
  parseSubNativeTokenId,
  parseSubPsp22TokenId,
  parseSubTokensTokenId,
  SubNativeTokenSchema,
  Token,
  TokenId,
  TokenIdSpecs,
  TokenType,
} from "./tokens"
import { parseSolNativeTokenId, SolNativeTokenSchema } from "./tokens/SolNativeToken"

export type NetworkOfPlatform<P extends NetworkPlatform> = Extract<Network, { platform: P }>

export const isNetworkOfPlatform = <P extends NetworkPlatform>(
  network: Network | null | undefined,
  platform: P,
): network is Extract<Network, { platform: P }> => {
  return !!network && network.platform === platform
}

export const isNetworkInPlatforms = <P extends NetworkPlatform[]>(
  network: Network | null | undefined,
  platforms: P,
): network is NetworkOfPlatform<P[number]> => {
  return platforms.some((platform) => isNetworkOfPlatform(network, platform))
}

export const isNetworkDot = (network: Network | null | undefined) => {
  return isNetworkOfPlatform(network, "polkadot")
}

export const isNetworkEth = (network: Network | null | undefined) => {
  return isNetworkOfPlatform(network, "ethereum")
}

export const isNetworkSol = (network: Network | null | undefined) => {
  return isNetworkOfPlatform(network, "solana")
}

export const getNetworkGenesisHash = <
  Net extends Network,
  Res = Net extends DotNetwork ? DotNetwork["genesisHash"] : undefined,
>(
  network: Net | null | undefined,
): Res => {
  return (isNetworkDot(network) ? network.genesisHash : undefined) as Res
}

export type TokenOfType<T extends TokenType> = Extract<Token, { type: T }>
export type TokenOfPlatform<P extends NetworkPlatform> = Extract<Token, { platform: P }>
export type DotToken = TokenOfPlatform<"polkadot">
export type EthToken = TokenOfPlatform<"ethereum">
export type SolToken = TokenOfPlatform<"solana">

export const isTokenOfPlatform = <P extends NetworkPlatform>(
  token: Token | null | undefined,
  platform: P,
): token is TokenOfPlatform<P> => {
  return !!token && token.platform === platform
}

export const isTokenEth = (token: Token | null | undefined) => {
  return isTokenOfPlatform(token, "ethereum")
}

export const isTokenDot = (token: Token | null | undefined) => {
  return isTokenOfPlatform(token, "polkadot")
}

export const isTokenSol = (token: Token | null | undefined) => {
  return isTokenOfPlatform(token, "solana")
}

export const isTokenNeedExistentialDeposit = (token: Token) => "existentialDeposit" in token

export const isTokenOfType = <T extends TokenType>(
  token: Token | null | undefined,
  type: T,
): token is TokenOfType<T> => {
  return !!token && token.type === type
}

export const isTokenInTypes = <T extends TokenType[]>(
  token: Token | null | undefined,
  types: T,
): token is TokenOfType<T[number]> => {
  return types.some((type) => isTokenOfType(token, type))
}

export const isTokenSubNative = (token: Token | null | undefined) => {
  return isTokenOfType(token, "substrate-native")
}

export const isTokenSubAssets = (token: Token | null | undefined) => {
  return isTokenOfType(token, "substrate-assets")
}

export const isTokenSubDTao = (token: Token | null | undefined) => {
  return isTokenOfType(token, "substrate-dtao")
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

export const isTokenSubHydration = (token: Token | null | undefined) => {
  return isTokenOfType(token, "substrate-hydration")
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

export const isTokenSolSpl = (token: Token | null | undefined) => {
  return isTokenOfType(token, "sol-spl")
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
    case "substrate-dtao":
      return parseSubDTaoTokenId(tokenId) as TokenIdSpecs<T>
    case "substrate-tokens":
      return parseSubTokensTokenId(tokenId) as TokenIdSpecs<T>
    case "substrate-hydration":
      return parseSubHydrationTokenId(tokenId) as TokenIdSpecs<T>
    case "sol-native":
      return parseSolNativeTokenId(tokenId) as TokenIdSpecs<T>
    case "sol-spl":
      return parseSolSplTokenId(tokenId) as TokenIdSpecs<T>
  }
}

export const networkIdFromTokenId = (tokenId: TokenId): Network["id"] =>
  parseTokenId(tokenId).networkId

const PLATFORM_NATIVE_TOKENS = {
  polkadot: SubNativeTokenSchema.shape.type.value,
  ethereum: EvmNativeTokenSchema.shape.type.value,
  solana: SolNativeTokenSchema.shape.type.value,
}

export type NativeTokenType<P extends NetworkPlatform = NetworkPlatform> =
  (typeof PLATFORM_NATIVE_TOKENS)[P]

export type NativeToken<P extends NetworkPlatform = NetworkPlatform> = Extract<
  Token,
  { type: NativeTokenType<P> }
>

export const isNativeTokenType = <P extends NetworkPlatform = NetworkPlatform>(
  type: TokenType,
  platform?: P,
): type is NativeTokenType<P> => {
  if (platform) return type === PLATFORM_NATIVE_TOKENS[platform]
  return Object.values(PLATFORM_NATIVE_TOKENS).includes(type as NativeTokenType)
}

export const isNativeToken = <P extends NetworkPlatform = NetworkPlatform>(
  token: Token,
  platform?: P,
): token is NativeToken<P> => {
  return (isNativeTokenType(token.type, platform) && !platform) || token.platform === platform
}
