export type TokenList = Record<TokenId, Token>

export type TokenId = string

// by hacking declaration merging (typescript magic) we can add variants to this type from within other modules
// https://www.typescriptlang.org/docs/handbook/declaration-merging.html
// https://stackoverflow.com/a/58261244/3926156
// https://stackoverflow.com/a/56099769/3926156
// https://stackoverflow.com/a/56516998/3926156
export interface TokenTypes {} // eslint-disable-line @typescript-eslint/no-empty-interface

export type ValidTokenTypes = {
  // Check that each plugin-provided TokenType is a valid Token (i.e. has all of the IToken fields)
  [TokenType in keyof TokenTypes]: TokenTypes[TokenType] extends IToken
    ? // Include the valid token
      TokenTypes[TokenType]
    : // Don't include the invalid token
      never
}

export type Token = ValidTokenTypes[keyof ValidTokenTypes] extends never
  ? // When no TokenTypes provided, default to the base IToken
    IToken
  : ValidTokenTypes[keyof ValidTokenTypes]

export type IToken = {
  id: TokenId
  type: string
  isTestnet: boolean
  symbol: string
  decimals: number
  coingeckoId?: string
  // TODO: Refactor these out of the Token type, they should be defined in @talismn/token-rates
  rates?: TokenRates
}

// TODO: Refactor these out of the Token type, they should be defined in @talismn/token-rates
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
