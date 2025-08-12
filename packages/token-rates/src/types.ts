import { TokenId } from "@talismn/chaindata-provider"

export const SUPPORTED_CURRENCIES = {
  btc: { name: "Bitcoin", symbol: "₿" },
  eth: { name: "Ethereum", symbol: "Ξ" },
  dot: { name: "Polkadot", symbol: "D" },
  tao: { name: "Bittensor", symbol: "τ" },

  usd: { name: "US Dollar", symbol: "$" },
  cny: { name: "Chinese Yuan", symbol: "¥" },
  eur: { name: "Euro", symbol: "€" },
  gbp: { name: "British Pound", symbol: "£" },
  cad: { name: "Canadian Dollar", symbol: "C$" },
  aud: { name: "Australian Dollar", symbol: "A$" },
  nzd: { name: "New Zealand Dollar", symbol: "NZ$" },
  jpy: { name: "Japanese Yen", symbol: "¥" },
  rub: { name: "Russian Ruble", symbol: "₽" },
  krw: { name: "South Korean Won", symbol: "₩" },
  idr: { name: "Indonesian Rupiah", symbol: "Rp" },
  php: { name: "Philippine Peso", symbol: "₱" },
  thb: { name: "Thai Baht", symbol: "฿" },
  vnd: { name: "Vietnamese Dong", symbol: "₫" },
  inr: { name: "Indian Rupee", symbol: "₹" },
  try: { name: "Turkish Lira", symbol: "₺" },
  // hkd: { name: "Hong Kong Dollar", symbol: "HK$" },
  sgd: { name: "Singapore Dollar", symbol: "S$" },
  // twd: { name: "Taiwanese Dollar", symbol: "NT$" },
} as const

export type TokenRatesStorage = { tokenRates: TokenRatesList }

export type TokenRatesList = Record<TokenId, TokenRates>
export type TokenRates = Record<TokenRateCurrency, TokenRateData | null>

export type TokenRateData = { price: number; marketCap?: number; change24h?: number }
export type TokenRateCurrency = keyof typeof SUPPORTED_CURRENCIES

export const newTokenRates = (): TokenRates => ({
  btc: null,
  eth: null,
  dot: null,
  tao: null,

  usd: null,
  cny: null,
  eur: null,
  gbp: null,
  cad: null,
  aud: null,
  nzd: null,
  jpy: null,
  rub: null,
  krw: null,
  idr: null,
  php: null,
  thb: null,
  vnd: null,
  inr: null,
  try: null,
  // hkd: null,
  sgd: null,
  // twd: null,
})
