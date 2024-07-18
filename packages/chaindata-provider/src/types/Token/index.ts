import { CustomEvmErc20Token, EvmErc20Token } from "./EvmErc20Token"
import { EvmNativeToken } from "./EvmNativeToken"
import { CustomEvmUniswapV2Token, EvmUniswapV2Token } from "./EvmUniswapV2Token"
import { SubAssetsToken } from "./SubstrateAssetsToken"
import { SubEquilibriumToken } from "./SubstrateEquilibriumToken"
import { CustomSubNativeToken, SubNativeToken } from "./SubstrateNativeToken"
import { SubPsp22Token } from "./SubstratePsp22Token"
import { SubTokensToken } from "./SubstrateTokensToken"
import { TokenBase, TokenId } from "./types"

export type { TokenId } from "./types"

/** A collection of `Token` objects */
export type TokenList = Record<TokenId, Token>

/**
 * The `Token` sum type, which is a union of all of the possible `TokenTypes`.
 */
export type Token = TokenBase &
  (
    | EvmErc20Token
    | CustomEvmErc20Token
    | EvmNativeToken
    | EvmUniswapV2Token
    | CustomEvmUniswapV2Token
    | SubAssetsToken
    | SubEquilibriumToken
    | SubNativeToken
    | CustomSubNativeToken
    | SubPsp22Token
    | SubTokensToken
  )

/**
 * A selection of fields which can be set as part of the `BalancesConfig` section on chaindata for any module type.
 *
 * Generally speaking, these fields will override any defaults set by the module itself.
 *
 * E.g. if the module determines a native token to have the symbol `IBTC`, but we want to show it
 * as `iBTC`, we can set the `symbol` field in chaindata at: `chains.interlay.balancesConfig.substrate-native.symbol`.
 */
export type BalancesConfigTokenParams = Pick<
  Partial<Token>,
  "symbol" | "coingeckoId" | "dcentName" | "mirrorOf" | "logo" | "isDefault"
>
