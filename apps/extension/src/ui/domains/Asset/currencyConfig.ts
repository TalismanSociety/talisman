import { TokenRateCurrency } from "@talismn/token-rates"

const currencyConfig: Partial<
  Record<TokenRateCurrency, { unicodeCharacter: string; name: string }>
> = {
  usd: {
    unicodeCharacter: "$",
    name: "US Dollar",
  },
  eur: {
    unicodeCharacter: "€",
    name: "Euro",
  },
  gbp: {
    unicodeCharacter: "£",
    name: "British Pound",
  },
  jpy: {
    unicodeCharacter: "¥",
    name: "Japanese Yen",
  },
  cny: {
    unicodeCharacter: "¥",
    name: "Chinese Yuan",
  },
  rub: {
    unicodeCharacter: "₽",
    name: "Russian Ruble",
  },
  btc: {
    unicodeCharacter: "₿",
    name: "Bitcoin",
  },
  eth: {
    unicodeCharacter: "Ξ",
    name: "Ethereum",
  },
  dot: {
    unicodeCharacter: "Ƿ",
    name: "Polkadot",
  },
}

export default currencyConfig
