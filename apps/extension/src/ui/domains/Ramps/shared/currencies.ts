type RampsCurrencies = {
  [key: string]: {
    name: string
    icon: string
  }
}

const RAMPS_CURRENCIES_MAP: RampsCurrencies = {
  ISK: { name: "Icelandic Krona", icon: "circle-flags:is" },
  GEL: { name: "Georgian Lari", icon: "circle-flags:ge" },
  GBP: { name: "British Pound Sterling", icon: "circle-flags:gb" },
  BAM: {
    name: "Bosnia-Herzegovina Convertible Mark",
    icon: "circle-flags:ba",
  },
  COP: { name: "Colombian Peso", icon: "circle-flags:co" },
  BRL: { name: "Brazilian Real", icon: "circle-flags:br" },
  RSD: { name: "Serbian Dinar", icon: "circle-flags:rs" },
  HUF: { name: "Hungarian Forint", icon: "circle-flags:hu" },
  HNL: { name: "Honduran Lempira", icon: "circle-flags:hn" },
  MYR: { name: "Malaysian Ringgit", icon: "circle-flags:my" },
  EUR: { name: "Euro", icon: "circle-flags:eu" },
  CHF: { name: "Swiss Franc", icon: "circle-flags:ch" },
  TJS: { name: "Tajikistani Somoni", icon: "circle-flags:tj" },
  BMD: { name: "Bermudian Dollar", icon: "circle-flags:bm" },
  KZT: { name: "Kazakhstani Tenge", icon: "circle-flags:kz" },
  USD: { name: "United States Dollar", icon: "circle-flags:us" },
  DKK: { name: "Danish Krone", icon: "circle-flags:dk" },
  PEN: { name: "Peruvian Sol", icon: "circle-flags:pe" },
  DOP: { name: "Dominican Peso", icon: "circle-flags:do" },
  PYG: { name: "Paraguayan Guarani", icon: "circle-flags:py" },
  RON: { name: "Romanian Leu", icon: "circle-flags:ro" },
  BWP: { name: "Botswana Pula", icon: "circle-flags:bw" },
  UAH: { name: "Ukrainian Hryvnia", icon: "circle-flags:ua" },
  MZN: { name: "Mozambican Metical", icon: "circle-flags:mz" },
  PLN: { name: "Polish Zloty", icon: "circle-flags:pl" },
  ILS: { name: "Israeli New Shekel", icon: "circle-flags:il" },
  LKR: { name: "Sri Lankan Rupee", icon: "circle-flags:lk" },
  INR: { name: "Indian Rupee", icon: "circle-flags:in" },
  KWD: { name: "Kuwaiti Dinar", icon: "circle-flags:kw" },
  MXN: { name: "Mexican Peso", icon: "circle-flags:mx" },
  THB: { name: "Thai Baht", icon: "circle-flags:th" },
  NZD: { name: "New Zealand Dollar", icon: "circle-flags:nz" },
  BGN: { name: "Bulgarian Lev", icon: "circle-flags:bg" },
  KES: { name: "Kenyan Shilling", icon: "circle-flags:ke" },
  UYU: { name: "Uruguayan Peso", icon: "circle-flags:uy" },
  NGN: { name: "Nigerian Naira", icon: "circle-flags:ng" },
  LAK: { name: "Lao Kip", icon: "circle-flags:la" },
  MKD: { name: "Macedonian Denar", icon: "circle-flags:mk" },
  SEK: { name: "Swedish Krona", icon: "circle-flags:se" },
  HKD: { name: "Hong Kong Dollar", icon: "circle-flags:hk" },
  ZAR: { name: "South African Rand", icon: "circle-flags:za" },
  GTQ: { name: "Guatemalan Quetzal", icon: "circle-flags:gt" },
  MDL: { name: "Moldovan Leu", icon: "circle-flags:md" },
  CRC: { name: "Costa Rican Colón", icon: "circle-flags:cr" },
  CZK: { name: "Czech Koruna", icon: "circle-flags:cz" },
  SGD: { name: "Singapore Dollar", icon: "circle-flags:sg" },

  // Coinbase
  AED: { name: "United Arab Emirates Dirham", icon: "circle-flags:ae" },
  ARS: { name: "Argentine Peso", icon: "circle-flags:ar" },
  AUD: { name: "Australian Dollar", icon: "circle-flags:au" },
  AZN: { name: "Azerbaijani Manat", icon: "circle-flags:az" },
  BOB: { name: "Bolivian Boliviano", icon: "circle-flags:bo" },
  CAD: { name: "Canadian Dollar", icon: "circle-flags:ca" },
  CLP: { name: "Chilean Peso", icon: "circle-flags:cl" },
  GHS: { name: "Ghanaian Cedi", icon: "circle-flags:gh" },
  HRK: { name: "Croatian Kuna", icon: "circle-flags:hr" },
  IDR: { name: "Indonesian Rupiah", icon: "circle-flags:id" },
  JMD: { name: "Jamaican Dollar", icon: "circle-flags:jm" },
  JOD: { name: "Jordanian Dinar", icon: "circle-flags:jo" },
  KHR: { name: "Cambodian Riel", icon: "circle-flags:kh" },
  MGA: { name: "Malagasy Ariary", icon: "circle-flags:mg" },
  MNT: { name: "Mongolian Tugrik", icon: "circle-flags:mn" },
  NOK: { name: "Norwegian Krone", icon: "circle-flags:no" },
  NPR: { name: "Nepalese Rupee", icon: "circle-flags:np" },
  PAB: { name: "Panamanian Balboa", icon: "circle-flags:pa" },
  PHP: { name: "Philippine Peso", icon: "circle-flags:ph" },
  PKR: { name: "Pakistani Rupee", icon: "circle-flags:pk" },
  TRY: { name: "Turkish Lira", icon: "circle-flags:tr" },
  TWD: { name: "New Taiwan Dollar", icon: "circle-flags:tw" },
  UGX: { name: "Ugandan Shilling", icon: "circle-flags:ug" },
  UZS: { name: "Uzbekistan Som", icon: "circle-flags:uz" },
  XAF: { name: "Central African Cfa Franc", icon: "circle-flags:ga" }, // used in multiple countries, use Gabon icon
  XOF: { name: "West African Cfa Franc", icon: "circle-flags:bf" }, // used in multiple countries, use Burkina Faso icon
  YER: { name: "Yemeni Rial", icon: "circle-flags:ye" },
  ZMW: { name: "Zambian Kwacha", icon: "circle-flags:zm" },
  ZWL: { name: "Zimbabwean Dollar", icon: "circle-flags:zw" },
}

export type RampsCurrency = RampsCurrencies[keyof RampsCurrencies] & { code: string }

export const RAMPS_CURRENCIES: RampsCurrency[] = Object.entries(RAMPS_CURRENCIES_MAP).map(
  ([code, data]) => ({ code, ...data }),
)

export const getRampsCurrency = (code: string): RampsCurrency | null =>
  RAMPS_CURRENCIES_MAP[code] ? { code, ...RAMPS_CURRENCIES_MAP[code] } : null
