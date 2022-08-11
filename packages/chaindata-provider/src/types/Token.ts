import { PluginTokenTypes } from "../plugins"
import { ChainId } from "./Chain"
import { EvmNetworkId } from "./EvmNetwork"

/**
 * `TokenTypes` is an automatically determined sub-selection of `PluginTokenTypes`.
 *
 * It is the same list, but with any invalid `TokenType` definitions filtered out.
 */
export type TokenTypes = {
  // Check that each plugin-provided TokenType is a valid Token (i.e. it has all of the IToken fields)
  [TokenType in keyof PluginTokenTypes]: PluginTokenTypes[TokenType] extends IToken
    ? // Include the valid token in TokenTypes
      PluginTokenTypes[TokenType]
    : // Don't include the invalid token
      never
}

/**
 * The `Token` sum type, which is a union of all of the possible `TokenTypes`.
 *
 * Each variant comes from a plugin in use by the consuming app.
 *
 * For example, in an app with the `substrate-native`, `evm-native`, `substrate-orml` and `evm-erc20` plugins:
 *
 *     type Token = SubNativeToken | EvmNativeToken | SubOrmlToken | EvmErc20Token
 *
 * If `TokenTypes` is empty then `Token` will fall back to the common `IToken` interface, which every token must implement.
 */
export type Token = TokenTypes[keyof TokenTypes] extends never
  ? // Default to the common-base `IToken` when no TokenTypes are defined.
    // This allows access to common token properties from within libraries like `@talismn/balances`.
    IToken
  : TokenTypes[keyof TokenTypes]

/** A collection of `Token` objects */
export type TokenList = Record<TokenId, Token>

export type TokenId = string

/** `IToken` is a common interface which all tokens must implement. */
export type IToken = {
  id: TokenId
  type: string
  isTestnet: boolean
  symbol: string
  decimals: number
  coingeckoId?: string

  // These are here because they *may* be present on a number of different token types.
  // By including them here (as potentially undefined), we can avoid having to check for them on every token type.
  chain?: { id: ChainId } | null
  evmNetwork?: { id: EvmNetworkId } | null

  // TODO: Refactor these out of the Token type, they should be defined in @talismn/token-rates
  //       This will be a breaking change which requires us to refactor the wallet extension.
  rates?: TokenRates
}

/** Used by plugins to help define their custom `TokenType` */
export type NewTokenType<
  ModuleType extends string,
  TokenParams extends Record<string, unknown>
> = IToken & {
  type: ModuleType
} & TokenParams

// TODO: Refactor these out of the Token type, they should be defined in @talismn/token-rates
//       This will be a breaking change which requires us to refactor the wallet extension.
export type TokenRates = {
  /** us dollar rate */
  usd: number | null

  /** australian dollar rate */
  aud: number | null

  /** new zealand dollar rate */
  nzd: number | null

  /** canadian dollar rate */
  cud: number | null

  /** hong kong dollar rate */
  hkd: number | null

  /** euro rate */
  eur: number | null

  /** british pound sterling rate */
  gbp: number | null

  /** japanese yen rate */
  jpy: number | null

  /** south korean won rate */
  krw: number | null

  /** chinese yuan rate */
  cny: number | null

  /** btc rate */
  btc: number | null

  /** eth rate */
  eth: number | null

  /** dot rate */
  dot: number | null
}
