import z from "zod/v4"

import { EvmErc20TokenSchema } from "./EvmErc20Token"
import { EvmNativeTokenSchema } from "./EvmNativeToken"
import { EvmUniswapV2TokenSchema } from "./EvmUniswapV2Token"
import { SubAssetsTokenSchema } from "./SubstrateAssetsToken"
import { SubForeignAssetsTokenSchema } from "./SubstrateForeignAssetsToken"
import { SubNativeTokenSchema } from "./SubstrateNativeToken"
import { SubPsp22TokenSchema } from "./SubstratePsp22Token"
import { SubTokensTokenSchema } from "./SubstrateTokensToken"

/**
 * The `Token` sum type, which is a union of all of the possible `TokenTypes`.
 */
export const TokenSchemaBase = z.discriminatedUnion("type", [
  EvmErc20TokenSchema,
  EvmNativeTokenSchema,
  EvmUniswapV2TokenSchema,
  SubAssetsTokenSchema,
  SubForeignAssetsTokenSchema,
  SubNativeTokenSchema,
  SubPsp22TokenSchema,
  SubTokensTokenSchema,
])

export const TokenTypeSchema = z.enum(TokenSchemaBase.options.map((t) => t.shape.type.value))

export type Token = z.infer<typeof TokenSchemaBase>

export type TokenId = Token["id"]

export type TokenList = Record<TokenId, Token>

export type TokenType = z.infer<typeof TokenTypeSchema>

// transform to control in which order properties are output as JSON when parsed from schema
export const TokenSchema = TokenSchemaBase.transform((token: Token): Token => {
  // reorder properties for easier reading
  const {
    id,
    platform,
    networkId,
    type,
    symbol,
    decimals,
    name,
    coingeckoId,
    logo,
    isDefault,
    isTestnet,
    mirrorOf,
    noDiscovery,
  } = token

  return Object.assign(
    // appropriate order of base properties
    {
      id,
      platform,
      networkId,
      type,
      symbol,
      decimals,
      name,
      coingeckoId,
      logo,
      isDefault,
      isTestnet,
      mirrorOf,
      noDiscovery,
    },
    // token type specifics go after
    token,
  )
})
