import type {
  Account,
  AuthorizedSite,
  AuthorizedSites,
  BalanceSubscriptionResponse,
  Chain,
  ProviderType,
  SimpleEvmNetwork,
} from "extension-core"
import { Token } from "@talismn/chaindata-provider"
import { DbTokenRates } from "@talismn/token-rates"
import { AnalyticsCaptureRequest, SitesAuthorizedStore, Trees } from "extension-core"
/* eslint-disable @typescript-eslint/no-unused-vars */
import { TALISMAN_WEB_APP_DOMAIN } from "extension-shared"

import { ADDRESSES } from "../constants"

const authorisedSites = {
  [TALISMAN_WEB_APP_DOMAIN]: {
    addresses: Object.entries(ADDRESSES)
      .filter(([name, address]) => name !== "VITALIK")
      .map(([name, address]) => address),
    connectAllSubstrate: true,
    id: TALISMAN_WEB_APP_DOMAIN,
    origin: "Talisman",
    url: `https://${TALISMAN_WEB_APP_DOMAIN}`,
  },

  "app.stellaswap.com": {
    ethAddresses: [ADDRESSES.VITALIK],
    ethChainId: 1284,
    id: "app.stellaswap.com",
    origin: "",
    url: "https://app.stellaswap.com/en/exchange/swap",
  },
}

const sitesStore = new SitesAuthorizedStore(authorisedSites)

const mockedApiMethods = {
  analyticsCapture: jest
    .fn()
    .mockImplementation(
      (_request: AnalyticsCaptureRequest) => new Promise((resolve) => resolve(true)),
    ),
  accountsSubscribe: jest.fn().mockImplementation((cb: (accounts: Account[]) => void) => {
    cb([
      {
        type: "keypair",
        address: ADDRESSES.GAV,
        name: "Gav",
        curve: "sr25519",
        createdAt: 1739192645517,
      },
      {
        type: "keypair",
        address: ADDRESSES.VITALIK,
        name: "Vitalik",
        curve: "ethereum",
        createdAt: 1739192646517,
      },
      {
        type: "ledger-polkadot",
        address: ADDRESSES.ALICE,
        curve: "ed25519",
        name: "Substrate Ledger",
        app: "polkadot",
        accountIndex: 0,
        addressOffset: 0,
        genesisHash: "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3",
        createdAt: 1739192646517,
      },
    ])
    return () => undefined
  }),
  accountsCatalogSubscribe: jest.fn().mockImplementation((cb: (accounts: Trees) => void) => {
    cb({
      portfolio: [
        { address: ADDRESSES.GAV, type: "account" },
        { address: ADDRESSES.VITALIK, type: "account" },
        { address: ADDRESSES.ALICE, type: "account" },
      ],
      watched: [],
    })
    return () => undefined
  }),
  authorizedSitesSubscribe: jest.fn().mockImplementation((cb: (site: AuthorizedSites) => void) => {
    const sub = sitesStore.observable.subscribe(cb)
    return () => sub.unsubscribe()
  }),
  authorizedSiteUpdate: jest
    .fn()
    .mockImplementation((id: string, update: Partial<AuthorizedSite>) =>
      sitesStore.updateSite(id, update),
    ),
  authorizedSiteForget: jest
    .fn()
    .mockImplementation((id: string, type: ProviderType) => sitesStore.forgetSite(id, type)),
  balances: jest.fn().mockImplementation((cb: (balances: BalanceSubscriptionResponse) => void) => {
    cb({
      status: "initialising",
      data: [],
    })
  }),
  chains: jest.fn().mockImplementation((cb: (chains: Chain[]) => void) => {
    cb(polkadotChains)
  }),
  ethereumNetworks: jest
    .fn()
    .mockImplementation((cb: (evmNetworks: SimpleEvmNetwork[]) => void) => {
      cb([])
    }),
  tokens: jest.fn().mockImplementation((cb: (tokens: Token[]) => void) => {
    cb(mockTokens)
  }),
  tokenRates: jest.fn(getMockTokenRates),
}

// Create a proxy to handle the mocking, this enables us to log if a method is being accessed
export const mockedApi = new Proxy(jest.requireActual("@ui/api"), {
  get(target, prop) {
    if (Object.prototype.hasOwnProperty.call(mockedApiMethods, prop)) {
      // Use specific mock if defined
      return mockedApiMethods[prop as keyof typeof mockedApiMethods]
    }
    // Use generic mock for any other property
    // eslint-disable-next-line no-console
    console.log("Attempting to access un-mocked api method: ", prop)
    return target[prop as keyof typeof target]
  },
})

function getMockTokenRates(cb: (rates: DbTokenRates[]) => void) {
  cb([
    {
      tokenId: "1284-evm-erc20-0xffffffffa922fef94566104a6e5a35a4fcddaa9f",
      rates: {
        btc: {
          price: 9.8376e-7,
          marketCap: 1120.291917858449,
          change24h: -0.6995739004825059,
        },
        eth: {
          price: 0.00002615,
          marketCap: 29771.48035827377,
          change24h: -3.309408176133055,
        },
        tao: null,
        dot: {
          price: 0.01146351,
          marketCap: 13053350.4089089,
          change24h: 1.7226176666370996,
        },
        usd: {
          price: 0.093924,
          marketCap: 106977510.82556757,
          change24h: 1.2827026300241688,
        },
        cny: {
          price: 0.681135,
          marketCap: 775800908.5070157,
          change24h: 1.3700665180188427,
        },
        eur: {
          price: 0.089166,
          marketCap: 101558351.05967677,
          change24h: 0.9894178793142621,
        },
        gbp: {
          price: 0.074262,
          marketCap: 84583480.57440819,
          change24h: 0.8703754861087402,
        },
        cad: {
          price: 0.131739,
          marketCap: 150048796.23415765,
          change24h: 1.0912043411544499,
        },
        aud: {
          price: 0.144875,
          marketCap: 165009815.0781347,
          change24h: 1.4041268258911828,
        },
        nzd: {
          price: 0.159614,
          marketCap: 181797260.96443695,
          change24h: 1.3370862865171955,
        },
        jpy: {
          price: 14.25,
          marketCap: 16232553537.649935,
          change24h: 1.1933386777987982,
        },
        rub: {
          price: 10.4,
          marketCap: 11847593615.767365,
          change24h: 6.321813624674142,
        },
        krw: {
          price: 131.09,
          marketCap: 149308654567.2437,
          change24h: 1.2979167540541081,
        },
        idr: {
          price: 1490.26,
          marketCap: 1697383312755.538,
          change24h: 1.2339330636094297,
        },
        php: {
          price: 5.52,
          marketCap: 6281612993.054057,
          change24h: 5.710493732541172,
        },
        thb: {
          price: 3.24,
          marketCap: 3688584573.265565,
          change24h: 0.819249871767915,
        },
        vnd: {
          price: 2380.53,
          marketCap: 2711380719469.433,
          change24h: 1.0516686450883532,
        },
        inr: {
          price: 7.94,
          marketCap: 9039499319.855299,
          change24h: 1.3648414521559307,
        },
        try: {
          price: 3.25,
          marketCap: 3706321658.5154734,
          change24h: 1.231727082952439,
        },
        sgd: {
          price: 0.12622,
          marketCap: 143762797.6980469,
          change24h: 1.2578376244311116,
        },
      },
    },
    {
      tokenId: "137-evm-erc20-0xd6df932a45c0f255f85145f286ea0b292b21c90b",
      rates: {
        btc: {
          price: 0.00212008,
          marketCap: 31775.19704539381,
          change24h: 3.0416906531575365,
        },
        eth: {
          price: 0.05634936,
          marketCap: 844268.3967884398,
          change24h: 0.3147547196030105,
        },
        tao: null,
        dot: {
          price: 24.704724,
          marketCap: 370137151.7035932,
          change24h: 5.494559000037312,
        },
        usd: {
          price: 202.41,
          marketCap: 3036386874.996101,
          change24h: 5.128124801622068,
        },
        cny: {
          price: 1467.9,
          marketCap: 22020484894.84674,
          change24h: 5.218805653157145,
        },
        eur: {
          price: 192.16,
          marketCap: 2882150567.2938,
          change24h: 4.823704845653175,
        },
        gbp: {
          price: 160.04,
          marketCap: 2400367061.838167,
          change24h: 4.700142744281283,
        },
        cad: {
          price: 283.91,
          marketCap: 4258010333.639529,
          change24h: 4.929355855999569,
        },
        aud: {
          price: 312.22,
          marketCap: 4682081233.762118,
          change24h: 5.254159136070262,
        },
        nzd: {
          price: 343.98,
          marketCap: 5159009556.604628,
          change24h: 5.184573254107144,
        },
        jpy: {
          price: 30714,
          marketCap: 460539930759.3232,
          change24h: 5.035367948987518,
        },
        rub: {
          price: 22417,
          marketCap: 336255467255.5981,
          change24h: 10.3585568080618,
        },
        krw: {
          price: 282508,
          marketCap: 4237382417747.995,
          change24h: 5.143916563573157,
        },
        idr: {
          price: 3211630,
          marketCap: 48177928566733.72,
          change24h: 5.0775035905821575,
        },
        php: {
          price: 11885.48,
          marketCap: 178282979631.60733,
          change24h: 9.724026801999118,
        },
        thb: {
          price: 6979.19,
          marketCap: 104641482679.55305,
          change24h: 4.64707603273604,
        },
        vnd: {
          price: 5130221,
          marketCap: 76958238850205.73,
          change24h: 4.888319099650895,
        },
        inr: {
          price: 17103.7,
          marketCap: 256555270206.718,
          change24h: 5.21338220609387,
        },
        try: {
          price: 7012.76,
          marketCap: 105201999696.67741,
          change24h: 5.075213854982348,
        },
        sgd: {
          price: 272.01,
          marketCap: 4079191437.797253,
          change24h: 5.10231574100985,
        },
      },
    },
    {
      tokenId: "592-evm-erc20-0xfcde4a87b8b6fa58326bb462882f1778158b02f1",
      rates: {
        btc: {
          price: 0.00212008,
          marketCap: 31775.19704539381,
          change24h: 3.0416906531575365,
        },
        eth: {
          price: 0.05634936,
          marketCap: 844268.3967884398,
          change24h: 0.3147547196030105,
        },
        tao: null,
        dot: {
          price: 24.704724,
          marketCap: 370137151.7035932,
          change24h: 5.494559000037312,
        },
        usd: {
          price: 202.41,
          marketCap: 3036386874.996101,
          change24h: 5.128124801622068,
        },
        cny: {
          price: 1467.9,
          marketCap: 22020484894.84674,
          change24h: 5.218805653157145,
        },
        eur: {
          price: 192.16,
          marketCap: 2882150567.2938,
          change24h: 4.823704845653175,
        },
        gbp: {
          price: 160.04,
          marketCap: 2400367061.838167,
          change24h: 4.700142744281283,
        },
        cad: {
          price: 283.91,
          marketCap: 4258010333.639529,
          change24h: 4.929355855999569,
        },
        aud: {
          price: 312.22,
          marketCap: 4682081233.762118,
          change24h: 5.254159136070262,
        },
        nzd: {
          price: 343.98,
          marketCap: 5159009556.604628,
          change24h: 5.184573254107144,
        },
        jpy: {
          price: 30714,
          marketCap: 460539930759.3232,
          change24h: 5.035367948987518,
        },
        rub: {
          price: 22417,
          marketCap: 336255467255.5981,
          change24h: 10.3585568080618,
        },
        krw: {
          price: 282508,
          marketCap: 4237382417747.995,
          change24h: 5.143916563573157,
        },
        idr: {
          price: 3211630,
          marketCap: 48177928566733.72,
          change24h: 5.0775035905821575,
        },
        php: {
          price: 11885.48,
          marketCap: 178282979631.60733,
          change24h: 9.724026801999118,
        },
        thb: {
          price: 6979.19,
          marketCap: 104641482679.55305,
          change24h: 4.64707603273604,
        },
        vnd: {
          price: 5130221,
          marketCap: 76958238850205.73,
          change24h: 4.888319099650895,
        },
        inr: {
          price: 17103.7,
          marketCap: 256555270206.718,
          change24h: 5.21338220609387,
        },
        try: {
          price: 7012.76,
          marketCap: 105201999696.67741,
          change24h: 5.075213854982348,
        },
        sgd: {
          price: 272.01,
          marketCap: 4079191437.797253,
          change24h: 5.10231574100985,
        },
      },
    },
    {
      tokenId: "787-evm-native",
      rates: {
        btc: {
          price: 9.8376e-7,
          marketCap: 1120.291917858449,
          change24h: -0.6995739004825059,
        },
        eth: {
          price: 0.00002615,
          marketCap: 29771.48035827377,
          change24h: -3.309408176133055,
        },
        tao: null,
        dot: {
          price: 0.01146351,
          marketCap: 13053350.4089089,
          change24h: 1.7226176666370996,
        },
        usd: {
          price: 0.093924,
          marketCap: 106977510.82556757,
          change24h: 1.2827026300241688,
        },
        cny: {
          price: 0.681135,
          marketCap: 775800908.5070157,
          change24h: 1.3700665180188427,
        },
        eur: {
          price: 0.089166,
          marketCap: 101558351.05967677,
          change24h: 0.9894178793142621,
        },
        gbp: {
          price: 0.074262,
          marketCap: 84583480.57440819,
          change24h: 0.8703754861087402,
        },
        cad: {
          price: 0.131739,
          marketCap: 150048796.23415765,
          change24h: 1.0912043411544499,
        },
        aud: {
          price: 0.144875,
          marketCap: 165009815.0781347,
          change24h: 1.4041268258911828,
        },
        nzd: {
          price: 0.159614,
          marketCap: 181797260.96443695,
          change24h: 1.3370862865171955,
        },
        jpy: {
          price: 14.25,
          marketCap: 16232553537.649935,
          change24h: 1.1933386777987982,
        },
        rub: {
          price: 10.4,
          marketCap: 11847593615.767365,
          change24h: 6.321813624674142,
        },
        krw: {
          price: 131.09,
          marketCap: 149308654567.2437,
          change24h: 1.2979167540541081,
        },
        idr: {
          price: 1490.26,
          marketCap: 1697383312755.538,
          change24h: 1.2339330636094297,
        },
        php: {
          price: 5.52,
          marketCap: 6281612993.054057,
          change24h: 5.710493732541172,
        },
        thb: {
          price: 3.24,
          marketCap: 3688584573.265565,
          change24h: 0.819249871767915,
        },
        vnd: {
          price: 2380.53,
          marketCap: 2711380719469.433,
          change24h: 1.0516686450883532,
        },
        inr: {
          price: 7.94,
          marketCap: 9039499319.855299,
          change24h: 1.3648414521559307,
        },
        try: {
          price: 3.25,
          marketCap: 3706321658.5154734,
          change24h: 1.231727082952439,
        },
        sgd: {
          price: 0.12622,
          marketCap: 143762797.6980469,
          change24h: 1.2578376244311116,
        },
      },
    },
    {
      tokenId: "acala-substrate-native",
      rates: {
        btc: {
          price: 9.8376e-7,
          marketCap: 1120.291917858449,
          change24h: -0.6995739004825059,
        },
        eth: {
          price: 0.00002615,
          marketCap: 29771.48035827377,
          change24h: -3.309408176133055,
        },
        tao: null,
        dot: {
          price: 0.01146351,
          marketCap: 13053350.4089089,
          change24h: 1.7226176666370996,
        },
        usd: {
          price: 0.093924,
          marketCap: 106977510.82556757,
          change24h: 1.2827026300241688,
        },
        cny: {
          price: 0.681135,
          marketCap: 775800908.5070157,
          change24h: 1.3700665180188427,
        },
        eur: {
          price: 0.089166,
          marketCap: 101558351.05967677,
          change24h: 0.9894178793142621,
        },
        gbp: {
          price: 0.074262,
          marketCap: 84583480.57440819,
          change24h: 0.8703754861087402,
        },
        cad: {
          price: 0.131739,
          marketCap: 150048796.23415765,
          change24h: 1.0912043411544499,
        },
        aud: {
          price: 0.144875,
          marketCap: 165009815.0781347,
          change24h: 1.4041268258911828,
        },
        nzd: {
          price: 0.159614,
          marketCap: 181797260.96443695,
          change24h: 1.3370862865171955,
        },
        jpy: {
          price: 14.25,
          marketCap: 16232553537.649935,
          change24h: 1.1933386777987982,
        },
        rub: {
          price: 10.4,
          marketCap: 11847593615.767365,
          change24h: 6.321813624674142,
        },
        krw: {
          price: 131.09,
          marketCap: 149308654567.2437,
          change24h: 1.2979167540541081,
        },
        idr: {
          price: 1490.26,
          marketCap: 1697383312755.538,
          change24h: 1.2339330636094297,
        },
        php: {
          price: 5.52,
          marketCap: 6281612993.054057,
          change24h: 5.710493732541172,
        },
        thb: {
          price: 3.24,
          marketCap: 3688584573.265565,
          change24h: 0.819249871767915,
        },
        vnd: {
          price: 2380.53,
          marketCap: 2711380719469.433,
          change24h: 1.0516686450883532,
        },
        inr: {
          price: 7.94,
          marketCap: 9039499319.855299,
          change24h: 1.3648414521559307,
        },
        try: {
          price: 3.25,
          marketCap: 3706321658.5154734,
          change24h: 1.231727082952439,
        },
        sgd: {
          price: 0.12622,
          marketCap: 143762797.6980469,
          change24h: 1.2578376244311116,
        },
      },
    },
    {
      tokenId: "astar-substrate-assets-18446744073709551616-aca",
      rates: {
        btc: {
          price: 9.8376e-7,
          marketCap: 1120.291917858449,
          change24h: -0.6995739004825059,
        },
        eth: {
          price: 0.00002615,
          marketCap: 29771.48035827377,
          change24h: -3.309408176133055,
        },
        tao: null,
        dot: {
          price: 0.01146351,
          marketCap: 13053350.4089089,
          change24h: 1.7226176666370996,
        },
        usd: {
          price: 0.093924,
          marketCap: 106977510.82556757,
          change24h: 1.2827026300241688,
        },
        cny: {
          price: 0.681135,
          marketCap: 775800908.5070157,
          change24h: 1.3700665180188427,
        },
        eur: {
          price: 0.089166,
          marketCap: 101558351.05967677,
          change24h: 0.9894178793142621,
        },
        gbp: {
          price: 0.074262,
          marketCap: 84583480.57440819,
          change24h: 0.8703754861087402,
        },
        cad: {
          price: 0.131739,
          marketCap: 150048796.23415765,
          change24h: 1.0912043411544499,
        },
        aud: {
          price: 0.144875,
          marketCap: 165009815.0781347,
          change24h: 1.4041268258911828,
        },
        nzd: {
          price: 0.159614,
          marketCap: 181797260.96443695,
          change24h: 1.3370862865171955,
        },
        jpy: {
          price: 14.25,
          marketCap: 16232553537.649935,
          change24h: 1.1933386777987982,
        },
        rub: {
          price: 10.4,
          marketCap: 11847593615.767365,
          change24h: 6.321813624674142,
        },
        krw: {
          price: 131.09,
          marketCap: 149308654567.2437,
          change24h: 1.2979167540541081,
        },
        idr: {
          price: 1490.26,
          marketCap: 1697383312755.538,
          change24h: 1.2339330636094297,
        },
        php: {
          price: 5.52,
          marketCap: 6281612993.054057,
          change24h: 5.710493732541172,
        },
        thb: {
          price: 3.24,
          marketCap: 3688584573.265565,
          change24h: 0.819249871767915,
        },
        vnd: {
          price: 2380.53,
          marketCap: 2711380719469.433,
          change24h: 1.0516686450883532,
        },
        inr: {
          price: 7.94,
          marketCap: 9039499319.855299,
          change24h: 1.3648414521559307,
        },
        try: {
          price: 3.25,
          marketCap: 3706321658.5154734,
          change24h: 1.231727082952439,
        },
        sgd: {
          price: 0.12622,
          marketCap: 143762797.6980469,
          change24h: 1.2578376244311116,
        },
      },
    },
  ])
  return () => undefined
}

const mockTokens: Token[] = [
  {
    id: "1-evm-erc20-0x0000000000085d4780b73119b644ae5ecd22b376",
    type: "evm-erc20",
    isTestnet: false,
    isDefault: false,
    symbol: "TUSD",
    decimals: 18,
    logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/true-usd.webp",
    contractAddress: "0x0000000000085d4780b73119b644ae5ecd22b376",
    evmNetwork: {
      id: "1",
    },
    coingeckoId: "true-usd",
  },
  {
    id: "1-evm-erc20-0x0000000000095413afc295d19edeb1ad7b71c952",
    type: "evm-erc20",
    isTestnet: false,
    isDefault: false,
    symbol: "LON",
    decimals: 18,
    logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/tokenlon.webp",
    contractAddress: "0x0000000000095413afc295d19edeb1ad7b71c952",
    evmNetwork: {
      id: "1",
    },
    coingeckoId: "tokenlon",
  },
  {
    id: "1-evm-erc20-0x0000000000300dd8b0230efcfef136ecdf6abcde",
    type: "evm-erc20",
    isTestnet: false,
    isDefault: false,
    symbol: "DGNX",
    decimals: 18,
    logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/degenx.webp",
    contractAddress: "0x0000000000300dd8b0230efcfef136ecdf6abcde",
    evmNetwork: {
      id: "1",
    },
    coingeckoId: "degenx",
  },
  {
    id: "1-evm-erc20-0x000000000075f13bcf2e6652e84821e8b544f6f9",
    type: "evm-erc20",
    isTestnet: false,
    isDefault: false,
    symbol: "SIG",
    decimals: 18,
    logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/signet.webp",
    contractAddress: "0x000000000075f13bcf2e6652e84821e8b544f6f9",
    evmNetwork: {
      id: "1",
    },
    coingeckoId: "signet",
  },
  {
    id: "1-evm-erc20-0x0000000000ca73a6df4c58b84c5b4b847fe8ff39",
    type: "evm-erc20",
    isTestnet: false,
    isDefault: false,
    symbol: "ASTX",
    decimals: 18,
    logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/asterix.webp",
    contractAddress: "0x0000000000ca73a6df4c58b84c5b4b847fe8ff39",
    evmNetwork: {
      id: "1",
    },
    coingeckoId: "asterix",
  },
  {
    id: "1-evm-erc20-0x000000000503be77a5ed27bef2c19943a8b5ae73",
    type: "evm-erc20",
    isTestnet: false,
    isDefault: false,
    symbol: "XTREME",
    decimals: 18,
    logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/xtremeverse.webp",
    contractAddress: "0x000000000503be77a5ed27bef2c19943a8b5ae73",
    evmNetwork: {
      id: "1",
    },
    coingeckoId: "xtremeverse",
  },
  {
    id: "1-evm-erc20-0x00000000051b48047be6dc0ada6de5c3de86a588",
    type: "evm-erc20",
    isTestnet: false,
    isDefault: false,
    symbol: "BABYSHIB",
    decimals: 18,
    logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/baby-shiba-inu-erc.webp",
    contractAddress: "0x00000000051b48047be6dc0ada6de5c3de86a588",
    evmNetwork: {
      id: "1",
    },
    coingeckoId: "baby-shiba-inu-erc",
  },
  {
    id: "1-evm-erc20-0x0000000005c6b7c1fd10915a05f034f90d524d6e",
    type: "evm-erc20",
    isTestnet: false,
    isDefault: false,
    symbol: "TRYC",
    decimals: 6,
    logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/tryc.webp",
    contractAddress: "0x0000000005c6b7c1fd10915a05f034f90d524d6e",
    evmNetwork: {
      id: "1",
    },
    coingeckoId: "tryc",
  },
  {
    id: "1-evm-erc20-0x000000000a1c6659ac226dbb1c5bdc648df72e9e",
    type: "evm-erc20",
    isTestnet: false,
    isDefault: false,
    symbol: "LOOTER",
    decimals: 18,
    logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/looter.webp",
    contractAddress: "0x000000000a1c6659ac226dbb1c5bdc648df72e9e",
    evmNetwork: {
      id: "1",
    },
    coingeckoId: "looter",
  },
  {
    id: "1-evm-erc20-0x000000007a58f5f58e697e51ab0357bc9e260a04",
    type: "evm-erc20",
    isTestnet: false,
    isDefault: false,
    symbol: "CNV",
    decimals: 18,
    logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/concave.webp",
    contractAddress: "0x000000007a58f5f58e697e51ab0357bc9e260a04",
    evmNetwork: {
      id: "1",
    },
    coingeckoId: "concave",
  },
]

const polkadotChains: Chain[] = [
  {
    id: "acala",
    isTestnet: false,
    isDefault: true,
    sortIndex: 11,
    genesisHash: "0xfc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c",
    prefix: 10,
    name: "Acala",
    themeColor: "#e61059",
    logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/acala.svg",
    chainName: "Acala",
    chainType: "Live",
    implName: "acala",
    specName: "acala",
    specVersion: "2270",
    nativeToken: {
      id: "acala-substrate-native",
    },
    tokens: [
      {
        id: "acala-substrate-native",
      },
      {
        id: "acala-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiAIICqAygCIgC+7QA",
      },
      {
        id: "acala-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAsgIIAKIAvs0A",
      },
      {
        id: "acala-substrate-tokens-N4IgLgngDgpiBcIAyBLAjgVxQEwMICcB7Ad2wBtCBDAOxABoQA3SsjOeARgGYBfIA",
      },
      {
        id: "acala-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiADIAiA8kiAL5tA",
      },
      {
        id: "acala-substrate-tokens-N4IgLgngDgpiBcIAqB7A1jAdiANCAbgIYA2ArnPKJLAiACIDySIAvi0A",
      },
      {
        id: "acala-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54AOAXyA",
      },
      {
        id: "acala-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54AWAXyA",
      },
      {
        id: "acala-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54A2AXyA",
      },
      {
        id: "acala-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54AmAXyA",
      },
      {
        id: "acala-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BOAXyA",
      },
      {
        id: "acala-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BGAXyA",
      },
      {
        id: "acala-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54AGAXyA",
      },
      {
        id: "acala-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BWAXyA",
      },
      {
        id: "acala-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54B2AXyA",
      },
      {
        id: "acala-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BmAXyA",
      },
      {
        id: "acala-substrate-tokens-N4IgLgngDgpiBcIBiB7ATjAlgcwHYEEBnQmMEAGhADcBDAGwFc54BGAZgF8g",
      },
      {
        id: "acala-substrate-tokens-N4IgLgngDgpiBcIDKYCGAjANjAggZzxjAAUB7UzAFVIGsYA7EAGhADdVMBXOeABgF8gA",
      },
      {
        id: "acala-substrate-tokens-N4IgLgngDgpiBcICiAnAxgJgAwgDQgDcBDAGwFc5EALGAD3i1qwHYATAMwE4A2VgRgDMAFj5E2fbgCMio1kIF8YGNAA4hbTsxWTMOuAF8gA",
      },
      {
        id: "acala-substrate-tokens-N4IgLgngDgpiBcICiAnAxgJgAwgDQgDcBDAGwFc5EALGAD3i1oDMAWNAdgwGYYA2ARnZYAnABNhWJgA5hwrsLT8pAVgxNl-XjC7suolkqJSQAXyA",
      },
      {
        id: "acala-substrate-tokens-N4IgLgngDgpiBcICiAnAxgJgAwgDQgDcBDAGwFc5EALGAD3i1oFYAWIgZgHYisBGNACacmAIwBsvMQLHsYWIuLGiAZsoEi+LdmiYYicAL5A",
      },
      {
        id: "acala-substrate-tokens-N4IgLgngDgpiBcICiAnAxgJgAwgDQgDcBDAGwFc5EALGAD3i1oFYiAWAEwDYi121WYAZhgsARgEYmAdnFSAZqyxSicmAE5pc5RlYZpADhABfIA",
      },
      {
        id: "acala-substrate-tokens-N4IgLgngDgpiBcICiAnAxgJgAwgDQgDcBDAGwFc5EALGAD3i1rQA4stmAWIgMwwwGYWAIwCsATmYj+ANgCMAdmYATMTNlK0IkUO5Ki05rOYgAvkA",
      },
      {
        id: "acala-substrate-tokens-N4IgLgngDgpiBcIAiMAeBlAFgQwE5wBoQA3bAGwFc54BtUSWBEAFQHsBrGAOxCNMur1o1EAEEAquiQgAvjIJDGiNpx59yVBIpEAZJAHlmsmQF0ZQA",
      },
      {
        id: "acala-substrate-tokens-N4IgLgngDgpiBcIAiMAeBlAFgQwE5wBoQA3bAGwFc54BtUSWBEAFQHsBrGAOxCNMur1o1EAEEAquiQgAvjIJDGiAGKt8ASwDmXUQGddMMLxLkqCAMwyAujKA",
      },
      {
        id: "acala-substrate-tokens-N4IgLgngDgpiBcIAiMAeBlAFgQwE5wBoQA3bAGwFc54BtUSWBEAFQHsBrGAOxCNMur1o1EAEEAquiQgAvjIJDGiADIBLAI4VVAEwDCuVgHdtZVth59yVBAEYAzDIC6MoA",
      },
      {
        id: "acala-substrate-tokens-N4IgLgngDgpiBcIAiMAeBlAFgQwE5wBoQA3bAGwFc54BtUSWBEAFQHsBrGAOxCNMur1o1EAEEAwqJABfaQSGNEbTjz7kqCBSNEBVdEhnSAutKA",
      },
      {
        id: "acala-substrate-tokens-N4IgLgngDgpiBcIAiMAeBlAFgQwE5wBoQA3bAGwFc54BtUSWBEAFQHsBrGAOxCNMur1o1ZAHlmIAL6SCQxogAyASwCOFJQBMAwrlYB3DWVbYefclQQBGAMySAupKA",
      },
      {
        id: "acala-substrate-tokens-N4IgLgngDgpiBcIAiMAeBlAFgQwE5wBoQA3bAGwFc54BtUSWBEAFQHsBrGAOxCNMur1o1EAEEAquiQgAvjIJDGiAGKt8ASwDmXUQGddMMLxLkqCACwyAujKA",
      },
    ],
    account: "*25519",
    subscanUrl: "https://acala.subscan.io/",
    chainspecQrUrl: "https://metadata.novasama.io/qr/polkadot-acala_specs.png",
    latestMetadataQrUrl: "https://metadata.novasama.io/qr/polkadot-acala_metadata_latest.apng",
    isUnknownFeeToken: false,
    feeToken: null,
    rpcs: [
      {
        url: "wss://acala-rpc.dwellir.com",
      },
      {
        url: "wss://acala-rpc-0.aca-api.network",
      },
      {
        url: "wss://acala-rpc-1.aca-api.network",
      },
      {
        url: "wss://acala-rpc-3.aca-api.network/ws",
      },
    ],
    evmNetworks: [
      {
        id: "787",
      },
    ],
    parathreads: null,
    paraId: 2000,
    relay: {
      id: "polkadot",
    },
    balancesConfig: [
      {
        moduleType: "substrate-native",
        moduleConfig: {
          coingeckoId: "acala",
          logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/aca.svg",
        },
      },
      {
        moduleType: "substrate-tokens",
        moduleConfig: {
          tokens: [
            {
              symbol: "aSEED",
              decimals: 12,
              ed: "100000000000",
              onChainId: '{"type":"Token","value":{"type":"AUSD"}}',
              coingeckoId: "ausd-seed-acala",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/aseed.svg",
            },
            {
              symbol: "TAP",
              decimals: 12,
              ed: "1000000000000",
              onChainId: '{"type":"Token","value":{"type":"TAP"}}',
              coingeckoId: "tapio-protocol",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/unknown.svg",
            },
            {
              symbol: "lcDOT",
              decimals: 10,
              ed: "100000000",
              onChainId: '{"type":"LiquidCrowdloan","value":13}',
              coingeckoId: "liquid-crowdloan-dot",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/lcdot.svg",
            },
            {
              symbol: "LDOT",
              decimals: 10,
              ed: "500000000",
              onChainId: '{"type":"Token","value":{"type":"LDOT"}}',
              coingeckoId: "liquid-staking-dot",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/ldot.svg",
            },
            {
              symbol: "DOT",
              decimals: 10,
              ed: "100000000",
              onChainId: '{"type":"Token","value":{"type":"DOT"}}',
              coingeckoId: "polkadot",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/dot.svg",
            },
            {
              symbol: "EQD",
              decimals: 9,
              ed: "1000000000",
              onChainId: '{"type":"ForeignAsset","value":8}',
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/eqd.svg",
            },
            {
              symbol: "INTR",
              decimals: 10,
              ed: "1000000000",
              onChainId: '{"type":"ForeignAsset","value":4}',
              coingeckoId: "interlay",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/intr.svg",
            },
            {
              symbol: "WETH",
              decimals: 18,
              ed: "500000000000000",
              onChainId: '{"type":"ForeignAsset","value":6}',
              coingeckoId: "weth",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/weth.webp",
            },
            {
              symbol: "ASTR",
              decimals: 18,
              ed: "100000000000000000",
              onChainId: '{"type":"ForeignAsset","value":2}',
              coingeckoId: "astar",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/astar.webp",
            },
            {
              symbol: "PHA",
              decimals: 12,
              ed: "100000000000",
              onChainId: '{"type":"ForeignAsset","value":9}',
              coingeckoId: "pha",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/pha.webp",
            },
            {
              symbol: "PARA",
              decimals: 12,
              ed: "100000000000",
              onChainId: '{"type":"ForeignAsset","value":1}',
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/unknown.svg",
            },
            {
              symbol: "GLMR",
              decimals: 18,
              ed: "100000000000000000",
              onChainId: '{"type":"ForeignAsset","value":0}',
              coingeckoId: "moonbeam",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/glmr.svg",
            },
            {
              symbol: "WBTC",
              decimals: 8,
              ed: "3000",
              onChainId: '{"type":"ForeignAsset","value":5}',
              coingeckoId: "wrapped-bitcoin",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/wrapped-bitcoin.webp",
            },
            {
              symbol: "EQ",
              decimals: 9,
              ed: "1000000000",
              onChainId: '{"type":"ForeignAsset","value":7}',
              coingeckoId: "equilibrium-token",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/eq.svg",
            },
            {
              symbol: "IBTC",
              decimals: 8,
              ed: "100",
              onChainId: '{"type":"ForeignAsset","value":3}',
              coingeckoId: "interbtc",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/ibtc.svg",
            },
            {
              symbol: "PINK",
              decimals: 10,
              ed: "1000000000",
              onChainId: '{"type":"ForeignAsset","value":13}',
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/pink.svg",
            },
            {
              symbol: "tDOT",
              decimals: 10,
              ed: "100000000",
              onChainId: '{"type":"StableAssetPoolToken","value":0}',
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/tdot.svg",
            },
            {
              symbol: "USDCet",
              decimals: 6,
              ed: "10000",
              onChainId:
                '{"type":"Erc20","value":"hex:0x07df96d1341a7d16ba1ad431e2c847d978bc2bce"}',
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/unknown.svg",
            },
            {
              symbol: "APE",
              decimals: 18,
              ed: "3000000000000000",
              onChainId:
                '{"type":"Erc20","value":"hex:0xf4c723e61709d90f89939c1852f516e373d418a8"}',
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/unknown.svg",
            },
            {
              symbol: "DAI",
              decimals: 18,
              ed: "10000000000000000",
              onChainId:
                '{"type":"Erc20","value":"hex:0x54a37a01cd75b616d63e0ab665bffdb0143c52ae"}',
              coingeckoId: "dai",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/dai.webp",
            },
            {
              symbol: "WETH",
              decimals: 18,
              ed: "8500000000000",
              onChainId:
                '{"type":"Erc20","value":"hex:0x5a4d6acdc4e3e5ab15717f407afe957f7a242578"}',
              coingeckoId: "weth",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/weth.webp",
            },
            {
              symbol: "WBTC",
              decimals: 8,
              ed: "60",
              onChainId:
                '{"type":"Erc20","value":"hex:0xc80084af223c8b598536178d9361dc55bfda6818"}',
              coingeckoId: "wrapped-bitcoin",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/wrapped-bitcoin.webp",
            },
            {
              symbol: "lp aSEED-LDOT",
              decimals: 12,
              ed: "100000000000",
              onChainId:
                '{"type":"DexShare","value":[{"type":"Token","value":{"type":"AUSD"}},{"type":"Token","value":{"type":"LDOT"}}]}',
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/unknown.svg",
            },
            {
              symbol: "lp aSEED-IBTC",
              decimals: 12,
              ed: "100000000000",
              onChainId:
                '{"type":"DexShare","value":[{"type":"Token","value":{"type":"AUSD"}},{"type":"ForeignAsset","value":3}]}',
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/unknown.svg",
            },
            {
              symbol: "lp aSEED-lcDOT",
              decimals: 12,
              ed: "100000000000",
              onChainId:
                '{"type":"DexShare","value":[{"type":"Token","value":{"type":"AUSD"}},{"type":"LiquidCrowdloan","value":13}]}',
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/unknown.svg",
            },
            {
              symbol: "lp ACA-aSEED",
              decimals: 12,
              ed: "100000000000",
              onChainId:
                '{"type":"DexShare","value":[{"type":"Token","value":{"type":"ACA"}},{"type":"Token","value":{"type":"AUSD"}}]}',
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/unknown.svg",
            },
            {
              symbol: "lp DOT-lcDOT",
              decimals: 10,
              ed: "100000000",
              onChainId:
                '{"type":"DexShare","value":[{"type":"Token","value":{"type":"DOT"}},{"type":"LiquidCrowdloan","value":13}]}',
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/unknown.svg",
            },
            {
              symbol: "lp aSEED-INTR",
              decimals: 12,
              ed: "100000000000",
              onChainId:
                '{"type":"DexShare","value":[{"type":"Token","value":{"type":"AUSD"}},{"type":"ForeignAsset","value":4}]}',
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/unknown.svg",
            },
          ],
        },
      },
    ],
    balancesMetadata: [],
    hasCheckMetadataHash: true,
  },
  {
    id: "acurast",
    isTestnet: false,
    isDefault: true,
    sortIndex: 14,
    genesisHash: "0xce7681fb12aa8f7265d229a9074be0ea1d5e99b53eedcec2deade43857901808",
    prefix: 42,
    name: "Acurast Canary",
    themeColor: "#505050",
    logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/unknown.svg",
    chainName: "Acurast Canary",
    chainType: "Live",
    implName: "acurast-parachain",
    specName: "acurast-parachain",
    specVersion: "20",
    nativeToken: {
      id: "acurast-substrate-native",
    },
    tokens: [
      {
        id: "acurast-substrate-native",
      },
    ],
    account: "*25519",
    subscanUrl: null,
    chainspecQrUrl: null,
    latestMetadataQrUrl: null,
    isUnknownFeeToken: false,
    feeToken: null,
    rpcs: [
      {
        url: "wss://public-rpc.canary.acurast.com",
      },
    ],
    evmNetworks: [],
    parathreads: null,
    paraId: 2239,
    relay: {
      id: "kusama",
    },
    balancesConfig: [],
    balancesMetadata: [],
    hasCheckMetadataHash: false,
  },
  {
    id: "ajuna",
    isTestnet: false,
    isDefault: true,
    sortIndex: 25,
    genesisHash: "0xe358eb1d11b31255a286c12e44fe6780b7edb171d657905a97e39f71d9c6c3ee",
    prefix: 1328,
    name: "Ajuna",
    themeColor: "#5785c4",
    logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/ajuna.svg",
    chainName: "Ajuna Polkadot",
    chainType: "Live",
    implName: "ajuna",
    specName: "ajuna",
    specVersion: "802",
    nativeToken: {
      id: "ajuna-substrate-native",
    },
    tokens: [
      {
        id: "ajuna-substrate-native",
      },
    ],
    account: "*25519",
    subscanUrl: null,
    chainspecQrUrl: null,
    latestMetadataQrUrl: null,
    isUnknownFeeToken: false,
    feeToken: null,
    rpcs: [
      {
        url: "wss://ajuna.ibp.network",
      },
      {
        url: "wss://ajuna.dotters.network",
      },
      {
        url: "wss://rpc-para.ajuna.network",
      },
    ],
    evmNetworks: [],
    parathreads: null,
    paraId: 2051,
    relay: {
      id: "polkadot",
    },
    balancesConfig: [
      {
        moduleType: "substrate-native",
        moduleConfig: {
          coingeckoId: "ajuna-network-2",
          logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/ajuna.svg",
        },
      },
    ],
    balancesMetadata: [],
    hasCheckMetadataHash: true,
  },
  {
    id: "aleph-zero",
    isTestnet: false,
    isDefault: true,
    sortIndex: 28,
    genesisHash: "0x70255b4d28de0fc4e1a193d7e175ad1ccef431598211c55538f1018651a0344e",
    prefix: 42,
    name: "Aleph Zero",
    themeColor: "#91979c",
    logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/aleph-zero.svg",
    chainName: "Aleph Zero",
    chainType: "Live",
    implName: "aleph-node",
    specName: "aleph-node",
    specVersion: "74",
    nativeToken: {
      id: "aleph-zero-substrate-native",
    },
    tokens: [
      {
        id: "aleph-zero-substrate-native",
      },
      {
        id: "aleph-zero-substrate-psp22-panx",
      },
      {
        id: "aleph-zero-substrate-psp22-ainu",
      },
      {
        id: "aleph-zero-substrate-psp22-iou",
      },
      {
        id: "aleph-zero-substrate-psp22-inw",
      },
      {
        id: "aleph-zero-substrate-psp22-pete",
      },
      {
        id: "aleph-zero-substrate-psp22-degen",
      },
      {
        id: "aleph-zero-substrate-psp22-ahero",
      },
      {
        id: "aleph-zero-substrate-psp22-weth",
      },
      {
        id: "aleph-zero-substrate-psp22-wbtc",
      },
      {
        id: "aleph-zero-substrate-psp22-usdt",
      },
      {
        id: "aleph-zero-substrate-psp22-usdc",
      },
      {
        id: "aleph-zero-substrate-psp22-cld",
      },
      {
        id: "aleph-zero-substrate-psp22-csd",
      },
      {
        id: "aleph-zero-substrate-psp22-sa0",
      },
    ],
    account: "*25519",
    subscanUrl: "https://alephzero.subscan.io/",
    chainspecQrUrl: "https://metadata.novasama.io/qr/aleph-node_specs.png",
    latestMetadataQrUrl: "https://metadata.novasama.io/qr/aleph-node_metadata_latest.apng",
    isUnknownFeeToken: false,
    feeToken: null,
    rpcs: [
      {
        url: "wss://aleph-zero-rpc.dwellir.com",
      },
      {
        url: "wss://ws.azero.dev",
      },
    ],
    evmNetworks: [],
    parathreads: null,
    paraId: null,
    relay: null,
    balancesConfig: [
      {
        moduleType: "substrate-native",
        moduleConfig: {
          coingeckoId: "aleph-zero",
          logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/aleph-zero.svg",
        },
      },
      {
        moduleType: "substrate-psp22",
        moduleConfig: {
          tokens: [
            {
              contractAddress: "5GSGAcvqpF5SuH2MhJ1YUdbLAbssCjeqCn2miMUCWUjnr5DQ",
              symbol: "PANX",
              coingeckoId: "panorama-swap-token",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/panorama-swap-token.webp",
            },
            {
              contractAddress: "5CSAAAbQpPeY1ieqRS7LynmuMHVJdthq8nxt2S4L6qBGcdnF",
              symbol: "AINU",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/unknown.svg",
            },
            {
              contractAddress: "5GYgJ1xBPtyUwbPVnDfbg9uRGWdGrcaM6y1TaftUMoxUHQh5",
              symbol: "IOU",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/unknown.svg",
            },
            {
              contractAddress: "5H4aCwLKUpVpct6XGJzDGPPXFockNKQU2JUVNgUw6BXEPzST",
              symbol: "INW",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/unknown.svg",
            },
            {
              contractAddress: "5FyVkDZi86awxJsXnJa2a1TeXwnMdhXmcQ2pmKLNmUgYRNM7",
              symbol: "PETE",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/unknown.svg",
            },
            {
              contractAddress: "5E3xgSL2kLA56Z7ykNwoGB4a9sdaYRbCBxRF4cDLQYhZU8bv",
              symbol: "DEGEN",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/unknown.svg",
            },
            {
              contractAddress: "5DDvG1bTGhWk8P9fZDcdp47TykhwGV46eKjr54SPcX1yTaRg",
              symbol: "AHERO",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/unknown.svg",
            },
            {
              symbol: "WETH",
              contractAddress: "5EoFQd36196Duo6fPTz2MWHXRzwTJcyETHyCyaB3rb61Xo2u",
              coingeckoId: "weth",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/weth.webp",
            },
            {
              symbol: "WBTC",
              contractAddress: "5EEtCdKLyyhQnNQWWWPM1fMDx1WdVuiaoR9cA6CWttgyxtuJ",
              coingeckoId: "wrapped-bitcoin",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/coingecko/wrapped-bitcoin.webp",
            },
            {
              symbol: "USDT",
              contractAddress: "5Et3dDcXUiThrBCot7g65k3oDSicGy4qC82cq9f911izKNtE",
              coingeckoId: "tether",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/usdt.svg",
            },
            {
              symbol: "USDC",
              contractAddress: "5FYFojNCJVFR2bBNKfAePZCa72ZcVX5yeTv8K9bzeUo8D83Z",
              coingeckoId: "usd-coin",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/usdc.svg",
            },
            {
              symbol: "CLD",
              contractAddress: "5CJ3DZ4RM4j2cPpQ49ywYiAgDYaTqk7hPud6Y1J1WY8qwDfb",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/unknown.svg",
            },
            {
              symbol: "CSD",
              contractAddress: "5DPzHtsvZHtUaGzzKqrxa2JLgpHtEaSPn9mfyNAjX12Vunts",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/unknown.svg",
            },
            {
              symbol: "sA0",
              contractAddress: "5FZ35bwDiXEHdvdmRn2bfcvb2LB9K9pM1dJaSJzj3n4sDoLA",
              logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/unknown.svg",
            },
          ],
        },
      },
    ],
    balancesMetadata: [],
    hasCheckMetadataHash: false,
  },
  {
    id: "aleph-zero-testnet",
    isTestnet: true,
    isDefault: true,
    sortIndex: 1095,
    genesisHash: "0x05d5279c52c484cc80396535a316add7d47b1c5b9e0398dd1f584149341460c5",
    prefix: 42,
    name: "Aleph Zero Testnet",
    themeColor: "#91979c",
    logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/aleph-zero-testnet.svg",
    chainName: "Aleph Zero Testnet",
    chainType: "Live",
    implName: "aleph-node",
    specName: "aleph-node",
    specVersion: "74",
    nativeToken: {
      id: "aleph-zero-testnet-substrate-native",
    },
    tokens: [
      {
        id: "aleph-zero-testnet-substrate-native",
      },
    ],
    account: "*25519",
    subscanUrl: null,
    chainspecQrUrl: null,
    latestMetadataQrUrl: null,
    isUnknownFeeToken: false,
    feeToken: null,
    rpcs: [
      {
        url: "wss://aleph-zero-testnet-rpc.dwellir.com",
      },
      {
        url: "wss://ws.test.azero.dev",
      },
    ],
    evmNetworks: [],
    parathreads: null,
    paraId: null,
    relay: null,
    balancesConfig: [],
    balancesMetadata: [],
    hasCheckMetadataHash: false,
  },
  {
    id: "altair",
    isTestnet: false,
    isDefault: true,
    sortIndex: 36,
    genesisHash: "0xaa3876c1dc8a1afcc2e9a685a49ff7704cfd36ad8c90bf2702b9d1b00cc40011",
    prefix: 136,
    name: "Altair",
    themeColor: "#bb8b49",
    logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/altair.svg",
    chainName: "Altair",
    chainType: "Live",
    implName: "altair",
    specName: "altair",
    specVersion: "1300",
    nativeToken: {
      id: "altair-substrate-native",
    },
    tokens: [
      {
        id: "altair-substrate-native",
      },
    ],
    account: "*25519",
    subscanUrl: "https://altair.subscan.io/",
    chainspecQrUrl: "https://metadata.novasama.io/qr/kusama-altair_specs.png",
    latestMetadataQrUrl: "https://metadata.novasama.io/qr/kusama-altair_metadata_latest.apng",
    isUnknownFeeToken: false,
    feeToken: null,
    rpcs: [
      {
        url: "wss://fullnode.altair.centrifuge.io",
      },
    ],
    evmNetworks: [],
    parathreads: null,
    paraId: 2088,
    relay: {
      id: "kusama",
    },
    balancesConfig: [
      {
        moduleType: "substrate-native",
        moduleConfig: {
          coingeckoId: "altair",
          logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/altair.svg",
        },
      },
    ],
    balancesMetadata: [],
    hasCheckMetadataHash: true,
  },
  {
    id: "analog-testnet",
    isTestnet: true,
    isDefault: true,
    sortIndex: 1109,
    genesisHash: "0x0614f7b74a2e47f7c8d8e2a5335be84bdde9402a43f5decdec03200a87c8b943",
    prefix: 12850,
    name: "Analog Testnet",
    themeColor: "#5d3ef8",
    logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/analog-testnet.svg",
    chainName: "Analog Testnet",
    chainType: "Live",
    implName: "analog-testnet",
    specName: "analog-testnet",
    specVersion: "129",
    nativeToken: {
      id: "analog-testnet-substrate-native",
    },
    tokens: [
      {
        id: "analog-testnet-substrate-native",
      },
    ],
    account: "*25519",
    subscanUrl: null,
    chainspecQrUrl: "https://metadata.analog.one/qr/analog-testnet_specs.png",
    latestMetadataQrUrl: "https://metadata.analog.one/qr/analog-testnet_metadata_latest.apng",
    isUnknownFeeToken: false,
    feeToken: null,
    rpcs: [
      {
        url: "wss://rpc.testnet.analog.one",
      },
    ],
    evmNetworks: [],
    parathreads: null,
    paraId: null,
    relay: null,
    balancesConfig: [
      {
        moduleType: "substrate-native",
        moduleConfig: {
          logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/tanlog.svg",
        },
      },
    ],
    balancesMetadata: [],
    hasCheckMetadataHash: true,
  },
  {
    id: "argon-testnet",
    isTestnet: true,
    isDefault: true,
    sortIndex: 1126,
    genesisHash: "0x08f92d6d7b1a39719b963ad25dfeba5a11331c4926a5a313fdfc9578150b5f69",
    prefix: 42,
    name: "Argon",
    themeColor: "#505050",
    logo: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/unknown.svg",
    chainName: "Argon Testnet",
    chainType: {
      Custom: "Testnet",
    },
    implName: "argon",
    specName: "argon",
    specVersion: "100",
    nativeToken: {
      id: "argon-testnet-substrate-native",
    },
    tokens: [
      {
        id: "argon-testnet-substrate-native",
      },
    ],
    account: "*25519",
    subscanUrl: null,
    chainspecQrUrl: null,
    latestMetadataQrUrl: null,
    isUnknownFeeToken: false,
    feeToken: null,
    rpcs: [
      {
        url: "wss://rpc.testnet.argonprotocol.org",
      },
    ],
    evmNetworks: [],
    parathreads: null,
    paraId: null,
    relay: null,
    balancesConfig: [],
    balancesMetadata: [],
    hasCheckMetadataHash: true,
  },
]
