type RampCurrencyInfos = {
  [key: string]: {
    countryCode: string
    currencyName: string
    icon: string
  }
}

export type RampCurrencyInfo = RampCurrencyInfos[keyof RampCurrencyInfos] & { code: string }

export const currencyInfo: RampCurrencyInfos = {
  ISK: { countryCode: "is", currencyName: "Icelandic Krona", icon: "circle-flags:is" },
  GEL: { countryCode: "ge", currencyName: "Georgian Lari", icon: "circle-flags:ge" },
  GBP: { countryCode: "gb", currencyName: "British Pound Sterling", icon: "circle-flags:gb" },
  BAM: {
    countryCode: "ba",
    currencyName: "Bosnia-Herzegovina Convertible Mark",
    icon: "circle-flags:ba",
  },
  COP: { countryCode: "co", currencyName: "Colombian Peso", icon: "circle-flags:co" },
  BRL: { countryCode: "br", currencyName: "Brazilian Real", icon: "circle-flags:br" },
  RSD: { countryCode: "rs", currencyName: "Serbian Dinar", icon: "circle-flags:rs" },
  HUF: { countryCode: "hu", currencyName: "Hungarian Forint", icon: "circle-flags:hu" },
  HNL: { countryCode: "hn", currencyName: "Honduran Lempira", icon: "circle-flags:hn" },
  MYR: { countryCode: "my", currencyName: "Malaysian Ringgit", icon: "circle-flags:my" },
  EUR: { countryCode: "eu", currencyName: "Euro", icon: "circle-flags:eu" },
  CHF: { countryCode: "ch", currencyName: "Swiss Franc", icon: "circle-flags:ch" },
  TJS: { countryCode: "tj", currencyName: "Tajikistani Somoni", icon: "circle-flags:tj" },
  BMD: { countryCode: "bm", currencyName: "Bermudian Dollar", icon: "circle-flags:bm" },
  KZT: { countryCode: "kz", currencyName: "Kazakhstani Tenge", icon: "circle-flags:kz" },
  USD: { countryCode: "us", currencyName: "United States Dollar", icon: "circle-flags:us" },
  DKK: { countryCode: "dk", currencyName: "Danish Krone", icon: "circle-flags:dk" },
  PEN: { countryCode: "pe", currencyName: "Peruvian Sol", icon: "circle-flags:pe" },
  DOP: { countryCode: "do", currencyName: "Dominican Peso", icon: "circle-flags:do" },
  PYG: { countryCode: "py", currencyName: "Paraguayan Guarani", icon: "circle-flags:py" },
  RON: { countryCode: "ro", currencyName: "Romanian Leu", icon: "circle-flags:ro" },
  BWP: { countryCode: "bw", currencyName: "Botswana Pula", icon: "circle-flags:bw" },
  UAH: { countryCode: "ua", currencyName: "Ukrainian Hryvnia", icon: "circle-flags:ua" },
  MZN: { countryCode: "mz", currencyName: "Mozambican Metical", icon: "circle-flags:mz" },
  PLN: { countryCode: "pl", currencyName: "Polish Zloty", icon: "circle-flags:pl" },
  ILS: { countryCode: "il", currencyName: "Israeli New Shekel", icon: "circle-flags:il" },
  LKR: { countryCode: "lk", currencyName: "Sri Lankan Rupee", icon: "circle-flags:lk" },
  INR: { countryCode: "in", currencyName: "Indian Rupee", icon: "circle-flags:in" },
  KWD: { countryCode: "kw", currencyName: "Kuwaiti Dinar", icon: "circle-flags:kw" },
  MXN: { countryCode: "mx", currencyName: "Mexican Peso", icon: "circle-flags:mx" },
  THB: { countryCode: "th", currencyName: "Thai Baht", icon: "circle-flags:th" },
  NZD: { countryCode: "nz", currencyName: "New Zealand Dollar", icon: "circle-flags:nz" },
  BGN: { countryCode: "bg", currencyName: "Bulgarian Lev", icon: "circle-flags:bg" },
  KES: { countryCode: "ke", currencyName: "Kenyan Shilling", icon: "circle-flags:ke" },
  UYU: { countryCode: "uy", currencyName: "Uruguayan Peso", icon: "circle-flags:uy" },
  NGN: { countryCode: "ng", currencyName: "Nigerian Naira", icon: "circle-flags:ng" },
  LAK: { countryCode: "la", currencyName: "Lao Kip", icon: "circle-flags:la" },
  MKD: { countryCode: "mk", currencyName: "Macedonian Denar", icon: "circle-flags:mk" },
  SEK: { countryCode: "se", currencyName: "Swedish Krona", icon: "circle-flags:se" },
  HKD: { countryCode: "hk", currencyName: "Hong Kong Dollar", icon: "circle-flags:hk" },
  ZAR: { countryCode: "za", currencyName: "South African Rand", icon: "circle-flags:za" },
  GTQ: { countryCode: "gt", currencyName: "Guatemalan Quetzal", icon: "circle-flags:gt" },
  MDL: { countryCode: "md", currencyName: "Moldovan Leu", icon: "circle-flags:md" },
  CRC: { countryCode: "cr", currencyName: "Costa Rican Colón", icon: "circle-flags:cr" },
  CZK: { countryCode: "cz", currencyName: "Czech Koruna", icon: "circle-flags:cz" },
  SGD: { countryCode: "sg", currencyName: "Singapore Dollar", icon: "circle-flags:sg" },

  // Coinbase
  AED: { countryCode: "ae", currencyName: "United Arab Emirates Dirham", icon: "circle-flags:ae" },
  ARS: { countryCode: "ar", currencyName: "Argentine Peso", icon: "circle-flags:ar" },
  AUD: { countryCode: "au", currencyName: "Australian Dollar", icon: "circle-flags:au" },
  AZN: { countryCode: "az", currencyName: "Azerbaijani Manat", icon: "circle-flags:az" },
  BOB: { countryCode: "bo", currencyName: "Bolivian Boliviano", icon: "circle-flags:bo" },
  CAD: { countryCode: "ca", currencyName: "Canadian Dollar", icon: "circle-flags:ca" },
  CLP: { countryCode: "cl", currencyName: "Chilean Peso", icon: "circle-flags:cl" },
  GHS: { countryCode: "gh", currencyName: "Ghanaian Cedi", icon: "circle-flags:gh" },
  HRK: { countryCode: "hr", currencyName: "Croatian Kuna", icon: "circle-flags:hr" },
  IDR: { countryCode: "id", currencyName: "Indonesian Rupiah", icon: "circle-flags:id" },
  JMD: { countryCode: "jm", currencyName: "Jamaican Dollar", icon: "circle-flags:jm" },
  JOD: { countryCode: "jo", currencyName: "Jordanian Dinar", icon: "circle-flags:jo" },
  KHR: { countryCode: "kh", currencyName: "Cambodian Riel", icon: "circle-flags:kh" },
  MGA: { countryCode: "mg", currencyName: "Malagasy Ariary", icon: "circle-flags:mg" },
  MNT: { countryCode: "mn", currencyName: "Mongolian Tugrik", icon: "circle-flags:mn" },
  NOK: { countryCode: "no", currencyName: "Norwegian Krone", icon: "circle-flags:no" },
  NPR: { countryCode: "np", currencyName: "Nepalese Rupee", icon: "circle-flags:np" },
  PAB: { countryCode: "pa", currencyName: "Panamanian Balboa", icon: "circle-flags:pa" },
  PHP: { countryCode: "ph", currencyName: "Philippine Peso", icon: "circle-flags:ph" },
  PKR: { countryCode: "pk", currencyName: "Pakistani Rupee", icon: "circle-flags:pk" },
  TRY: { countryCode: "tr", currencyName: "Turkish Lira", icon: "circle-flags:tr" },
  TWD: { countryCode: "tw", currencyName: "New Taiwan Dollar", icon: "circle-flags:tw" },
  UGX: { countryCode: "ug", currencyName: "Ugandan Shilling", icon: "circle-flags:ug" },
  UZS: { countryCode: "uz", currencyName: "Uzbekistan Som", icon: "circle-flags:uz" },
  XAF: { countryCode: "ga", currencyName: "Central African Cfa Franc", icon: "circle-flags:ga" }, // used in multi-country, use Gabon icon
  XOF: { countryCode: "bf", currencyName: "West African Cfa Franc", icon: "circle-flags:bf" }, // used in multiple countries, use Burkina Faso icon
  YER: { countryCode: "ye", currencyName: "Yemeni Rial", icon: "circle-flags:ye" },
  ZMW: { countryCode: "zm", currencyName: "Zambian Kwacha", icon: "circle-flags:zm" },
  ZWL: { countryCode: "zw", currencyName: "Zimbabwean Dollar", icon: "circle-flags:zw" },
}

export const getRampCurrencyInfo = (code: string): RampCurrencyInfo | null =>
  currencyInfo[code] ? { code, ...currencyInfo[code] } : null
