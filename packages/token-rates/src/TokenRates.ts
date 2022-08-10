import { TokenId } from "@talismn/chaindata-provider"

const coingeckoApiUrl = "https://api.coingecko.com/api/v3"
// const coingeckoCurrencies: Array<NonFunctionPropertyNames<TokenRates>> = [
//   "usd",
//   // 'aud',
//   // 'nzd',
//   // 'cud',
//   // 'hkd',
//   "eur",
//   // 'gbp',
//   // 'jpy',
//   // 'krw',
//   // 'cny',
//   // 'btc',
//   // 'eth',
//   // 'dot',
// ]

// async function updateTokenRates({ store }) {
//   const tokens = await store.find(Token, { loadRelationIds: { disableMixedMap: true } })

//   const coingeckoIds = tokens
//     .map((token) => {
//       if (token.squidImplementationDetail.isTestnet) return
//       if (!token.squidImplementationDetail.coingeckoId) return

//       return token.squidImplementationDetail.coingeckoId
//     })
//     .filter((id): id is NonNullable<typeof id> => Boolean(id))

//   const idsSerialized = coingeckoIds.join(",")
//   const currenciesSerialized = coingeckoCurrencies.join(",")
//   const coingeckoPrices: Record<string, Record<string, number>> = await axios
//     .get(
//       `${coingeckoApiUrl}/simple/price?ids=${idsSerialized}&vs_currencies=${currenciesSerialized}`
//     )
//     .then((response) => response.data)

//   const updatedTokens = tokens.map((token) => {
//     token.squidImplementationDetail.rates = null
//     if (token.squidImplementationDetail.isTestnet) return token
//     if (!token.squidImplementationDetail.coingeckoId) return token

//     const rates = coingeckoPrices[token.squidImplementationDetail.coingeckoId]
//     if (!rates) return token

//     token.squidImplementationDetail.rates = new TokenRates()
//     for (const currency of coingeckoCurrencies) {
//       token.squidImplementationDetail.rates[currency] = rates[currency]
//     }

//     return token
//   })

//   await store.save(updatedTokens)
// }

// export interface WithCoingeckoId {
//   coingeckoId: string
// }

// export function hasCoingeckoId<T extends Record<string, unknown>>(
//   token: T
// ): token is T & WithCoingeckoId {
//   return "coingeckoId" in token && typeof token.coingeckoId === "string"
// }

// export function tokenRates(tokens: WithCoingeckoId[]): TokenRatesList {}

export type TokenRatesList = Record<TokenId, TokenRates>
export type TokenRateCurrency = keyof TokenRates
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

// // Some handy types from https://www.typescriptlang.org/docs/handbook/advanced-types.html#distributive-conditional-types
// export type FunctionPropertyNames<T> = {
//   [K in keyof T]: T[K] extends Function ? K : never
// }[keyof T]
// export type FunctionProperties<T> = Pick<T, FunctionPropertyNames<T>>
// export type NonFunctionPropertyNames<T> = {
//   [K in keyof T]: T[K] extends Function ? never : K
// }[keyof T]
// export type NonFunctionProperties<T> = Pick<T, NonFunctionPropertyNames<T>>
