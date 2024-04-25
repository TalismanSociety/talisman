import { TokenRateCurrency } from "@talismn/token-rates"

import audIcon from "./currencyIcons/aud.svg?url"
import btcIcon from "./currencyIcons/btc.svg?url"
import cadIcon from "./currencyIcons/cad.svg?url"
import cnyIcon from "./currencyIcons/cny.svg?url"
import dotIcon from "./currencyIcons/dot.svg?url"
import ethIcon from "./currencyIcons/eth.svg?url"
import eurIcon from "./currencyIcons/eur.svg?url"
import gbpIcon from "./currencyIcons/gbp.svg?url"
import jpyIcon from "./currencyIcons/jpy.svg?url"
import rubIcon from "./currencyIcons/rub.svg?url"
import usdIcon from "./currencyIcons/usd.svg?url"

export const currencyOrder: TokenRateCurrency[] = [
  "btc",
  "eth",
  "dot",
  "usd",
  "aud",
  "cad",
  "cny",
  "eur",
  "gbp",
  "jpy",
  "rub",
]

const currencyConfig: Partial<
  Record<TokenRateCurrency, { unicodeCharacter: string; name: string; icon: string }>
> = {
  usd: {
    unicodeCharacter: "$",
    name: "US Dollar",
    icon: usdIcon,
  },
  aud: {
    unicodeCharacter: "$",
    name: "Australian Dollar",
    icon: audIcon,
  },
  cad: {
    unicodeCharacter: "$",
    name: "Canadian Dollar",
    icon: cadIcon,
  },
  eur: {
    unicodeCharacter: "€",
    name: "Euro",
    icon: eurIcon,
  },
  gbp: {
    unicodeCharacter: "£",
    name: "British Pound",
    icon: gbpIcon,
  },
  jpy: {
    unicodeCharacter: "¥",
    name: "Japanese Yen",
    icon: jpyIcon,
  },
  cny: {
    unicodeCharacter: "¥",
    name: "Chinese Yuan",
    icon: cnyIcon,
  },
  rub: {
    unicodeCharacter: "₽",
    name: "Russian Ruble",
    icon: rubIcon,
  },
  btc: {
    unicodeCharacter: "₿",
    name: "Bitcoin",
    icon: btcIcon,
  },
  eth: {
    unicodeCharacter: "Ξ",
    name: "Ethereum",
    icon: ethIcon,
  },
  dot: {
    unicodeCharacter: "D",
    name: "Polkadot",
    icon: dotIcon,
  },
}

export default currencyConfig
