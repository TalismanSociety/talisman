import { TokenId } from "@talismn/chaindata-provider"

export type TokenRatesList = Record<TokenId, TokenRates>
export type TokenRateCurrency = keyof TokenRates
export type DbTokenRates = { tokenId: TokenId; rates: TokenRates }
export type TokenRates = {
  /** us dollar rate */
  usd: number | null

  /** australian dollar rate */
  aud: number | null

  /** new zealand dollar rate */
  nzd: number | null

  /** canadian dollar rate */
  cad: number | null

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

  /** russian yuan rate */
  rub: number | null

  /** btc rate */
  btc: number | null

  /** eth rate */
  eth: number | null

  /** dot rate */
  dot: number | null
}
export const NewTokenRates = (): TokenRates => ({
  usd: null,
  aud: null,
  nzd: null,
  cad: null,
  hkd: null,
  eur: null,
  gbp: null,
  jpy: null,
  krw: null,
  cny: null,
  rub: null,
  btc: null,
  eth: null,
  dot: null,
})
