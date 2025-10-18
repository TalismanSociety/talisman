import z from "zod/v4"

import { EvmErc20TokenIdSpecs, EvmErc20TokenSchema } from "./EvmErc20Token"
import { EvmNativeTokenIdSpecs, EvmNativeTokenSchema } from "./EvmNativeToken"
import { EvmUniswapV2TokenIdSpecs, EvmUniswapV2TokenSchema } from "./EvmUniswapV2Token"
import { SolNativeToken, SolNativeTokenSchema } from "./SolNativeToken"
import { SolSplToken, SolSplTokenSchema } from "./SolSplToken"
import { SubAssetsTokenSchema, SubAssetTokenIdSpecs } from "./SubstrateAssetsToken"
import { SubDTaoTokenIdSpecs, SubDTaoTokenSchema } from "./SubstrateDTaoToken"
import {
  ForeignAssetsTokenIdSpecs,
  SubForeignAssetsTokenSchema,
} from "./SubstrateForeignAssetsToken"
import { SubHydrationToken, SubHydrationTokenSchema } from "./SubstrateHydrationToken"
import { SubNativeTokenIdSpecs, SubNativeTokenSchema } from "./SubstrateNativeToken"
import { SubPsp22TokenIdSpecs, SubPsp22TokenSchema } from "./SubstratePsp22Token"
import { SubTokensTokenIdSpecs, SubTokensTokenSchema } from "./SubstrateTokensToken"

/**
 * The `Token` sum type, which is a union of all of the possible `TokenTypes`.
 */
export const TokenSchemaBase = z.discriminatedUnion("type", [
  EvmErc20TokenSchema,
  EvmNativeTokenSchema,
  EvmUniswapV2TokenSchema,
  SubAssetsTokenSchema,
  SubDTaoTokenSchema,
  SubForeignAssetsTokenSchema,
  SubNativeTokenSchema,
  SubPsp22TokenSchema,
  SubTokensTokenSchema,
  SubHydrationTokenSchema,
  SolNativeTokenSchema,
  SolSplTokenSchema,
])

export const TokenTypeSchema = z.enum(TokenSchemaBase.options.map((t) => t.shape.type.value))

export type Token = z.infer<typeof TokenSchemaBase>

export type TokenId = Token["id"]

export type TokenList = Record<TokenId, Token>

export type TokenType = z.infer<typeof TokenTypeSchema>

export type TokenIdSpecs<T extends TokenType> = T extends "evm-erc20"
  ? EvmErc20TokenIdSpecs
  : T extends "evm-native"
    ? EvmNativeTokenIdSpecs
    : T extends "evm-uniswapv2"
      ? EvmUniswapV2TokenIdSpecs
      : T extends "substrate-assets"
        ? SubAssetTokenIdSpecs
        : T extends "substrate-dtao"
          ? SubDTaoTokenIdSpecs
          : T extends "substrate-foreignassets"
            ? ForeignAssetsTokenIdSpecs
            : T extends "substrate-native"
              ? SubNativeTokenIdSpecs
              : T extends "substrate-psp22"
                ? SubPsp22TokenIdSpecs
                : T extends "substrate-tokens"
                  ? SubTokensTokenIdSpecs
                  : T extends "substrate-hydration"
                    ? SubHydrationToken
                    : T extends "sol-native"
                      ? SolNativeToken
                      : T extends "sol-spl"
                        ? SolSplToken
                        : never

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
      mirrorOf,
      noDiscovery,
    },
    // token type specifics go after
    token,
  )
})
