import { SUPPORTED_CURRENCIES, TokenRateCurrency } from "@talismn/token-rates"

import audIcon from "./currencyIcons/aud.svg?url"
import btcIcon from "./currencyIcons/btc.svg?url"
import cadIcon from "./currencyIcons/cad.svg?url"
import cnyIcon from "./currencyIcons/cny.svg?url"
import dotIcon from "./currencyIcons/dot.svg?url"
import ethIcon from "./currencyIcons/eth.svg?url"
import eurIcon from "./currencyIcons/eur.svg?url"
import gbpIcon from "./currencyIcons/gbp.svg?url"
// import hkdIcon from "./currencyIcons/hkd.svg?url"
import idrIcon from "./currencyIcons/idr.svg?url"
import inrIcon from "./currencyIcons/inr.svg?url"
import jpyIcon from "./currencyIcons/jpy.svg?url"
import krwIcon from "./currencyIcons/krw.svg?url"
import nzdIcon from "./currencyIcons/nzd.svg?url"
import phpIcon from "./currencyIcons/php.svg?url"
import rubIcon from "./currencyIcons/rub.svg?url"
import sgdIcon from "./currencyIcons/sgd.svg?url"
import thbIcon from "./currencyIcons/thb.svg?url"
import tryIcon from "./currencyIcons/try.svg?url"
// import twdIcon from "./currencyIcons/twd.svg?url"
import usdIcon from "./currencyIcons/usd.svg?url"
import vndIcon from "./currencyIcons/vnd.svg?url"

const currencyIcons: Record<TokenRateCurrency, string | undefined> = {
  btc: btcIcon,
  eth: ethIcon,
  dot: dotIcon,

  usd: usdIcon,
  cny: cnyIcon,
  eur: eurIcon,
  gbp: gbpIcon,
  cad: cadIcon,
  aud: audIcon,
  nzd: nzdIcon,
  jpy: jpyIcon,
  rub: rubIcon,
  krw: krwIcon,
  idr: idrIcon,
  php: phpIcon,
  thb: thbIcon,
  vnd: vndIcon,
  inr: inrIcon,
  try: tryIcon,
  // hkd: hkdIcon,
  sgd: sgdIcon,
  // twd: twdIcon,
}

export const currencyOrder = Object.keys(SUPPORTED_CURRENCIES) as Array<
  keyof typeof SUPPORTED_CURRENCIES
>
export const sortCurrencies = (
  a: keyof typeof SUPPORTED_CURRENCIES,
  b: keyof typeof SUPPORTED_CURRENCIES,
) => currencyOrder.indexOf(a) - currencyOrder.indexOf(b)
export const currencyConfig = Object.fromEntries(
  currencyOrder.map((id) => [
    id,
    {
      symbol: SUPPORTED_CURRENCIES[id as TokenRateCurrency].symbol,
      name: SUPPORTED_CURRENCIES[id as TokenRateCurrency].name,
      icon: currencyIcons[id as TokenRateCurrency],
    },
  ]),
)
