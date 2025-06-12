import z from "zod/v4"

import { EvmErc20TokenDef } from "./EvmErc20Token"
import { EvmNativeTokenDef } from "./EvmNativeToken"
import { EvmUniswapV2TokenDef } from "./EvmUniswapV2Token"
import { SubAssetsTokenDef } from "./SubstrateAssetsToken"
import { SubForeignAssetsTokenDef } from "./SubstrateForeignAssetsToken"
import { SubNativeTokenDef } from "./SubstrateNativeToken"
import { SubPsp22TokenDef } from "./SubstratePsp22Token"
import { SubTokensTokenDef } from "./SubstrateTokensToken"

/**
 * The `Token` sum type, which is a union of all of the possible `TokenTypes`.
 */
export const TokenDef = z.union([
  EvmErc20TokenDef,
  EvmNativeTokenDef,
  EvmUniswapV2TokenDef,
  SubAssetsTokenDef,
  SubForeignAssetsTokenDef,
  SubNativeTokenDef,
  SubPsp22TokenDef,
  SubTokensTokenDef,
])
export type Token = z.infer<typeof TokenDef>

export type TokenId = Token["id"]
