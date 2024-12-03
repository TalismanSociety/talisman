import { Token } from "@talismn/chaindata-provider"
import { DbTokenRates } from "@talismn/token-rates"

import type {
  AuthorizedSite,
  AuthorizedSites,
  BalanceSubscriptionResponse,
  Chain,
  ProviderType,
  SimpleEvmNetwork,
} from "@extension/core"
import {
  AccountJsonAny,
  AccountType,
  AnalyticsCaptureRequest,
  SitesAuthorizedStore,
  Trees,
} from "@extension/core"
/* eslint-disable @typescript-eslint/no-unused-vars */
import { TALISMAN_WEB_APP_DOMAIN } from "@extension/shared"

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
  accountsSubscribe: jest.fn().mockImplementation((cb: (accounts: AccountJsonAny[]) => void) => {
    cb([
      {
        address: ADDRESSES.GAV,
        isExternal: false,
        isHardware: false,
        name: "Gav",
        suri: "a very bad mnemonic which actually doesn't have twelve words",
        type: "sr25519",
      },
      {
        address: ADDRESSES.VITALIK,
        isExternal: false,
        isHardware: false,
        name: "Vitalik",
        suri: "another very bad mnemonic which also doesn't have twelve words",
        type: "ethereum",
      },
      {
        address: ADDRESSES.ALICE,
        name: "Substrate Ledger",
        hardwareType: "ledger",
        isHardware: true,
        origin: AccountType.Ledger,
        accountIndex: 0,
        addressOffset: 0,
        genesisHash: "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3",
        type: "sr25519",
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
      tokenId: "1-evm-erc20-0xe41d2489571d322189246dafa5ebde1f4699f498",
      rates: {
        btc: 0.00000511,
        eth: 0.00013481,
        dot: 0.08141978,
        usd: 0.344325,
        cny: 2.45,
        eur: 0.319054,
        gbp: 0.266336,
        cad: 0.475965,
        aud: 0.518206,
        nzd: 0.57251,
        jpy: 52.44,
        rub: 33,
        krw: 474.86,
        idr: 5365.94,
        php: 19.96,
        thb: 11.62,
        vnd: 8754.46,
        inr: 28.95,
        try: 11.8,
        sgd: 0.45462,
      },
    },
    {
      tokenId: "137-evm-erc20-0xd6df932a45c0f255f85145f286ea0b292b21c90b",
      rates: {
        btc: 0.00224703,
        eth: 0.05928282,
        dot: 35.802329,
        usd: 151.41,
        cny: 1076.7,
        eur: 140.3,
        gbp: 117.11,
        cad: 209.29,
        aud: 227.87,
        nzd: 251.75,
        jpy: 23057,
        rub: 14513,
        krw: 208807,
        idr: 2359523,
        php: 8778.44,
        thb: 5111.13,
        vnd: 3849528,
        inr: 12728.42,
        try: 5189.3,
        sgd: 199.91,
      },
    },
    {
      tokenId: "592-evm-erc20-0xfcde4a87b8b6fa58326bb462882f1778158b02f1",
      rates: {
        btc: 0.00224703,
        eth: 0.05928282,
        dot: 35.802329,
        usd: 151.41,
        cny: 1076.7,
        eur: 140.3,
        gbp: 117.11,
        cad: 209.29,
        aud: 227.87,
        nzd: 251.75,
        jpy: 23057,
        rub: 14513,
        krw: 208807,
        idr: 2359523,
        php: 8778.44,
        thb: 5111.13,
        vnd: 3849528,
        inr: 12728.42,
        try: 5189.3,
        sgd: 199.91,
      },
    },
    {
      tokenId: "1284-evm-erc20-0xffffffffa922fef94566104a6e5a35a4fcddaa9f",
      rates: {
        btc: 8.77778e-7,
        eth: 0.00002316,
        dot: 0.01398629,
        usd: 0.059148,
        cny: 0.42062,
        eur: 0.054807,
        gbp: 0.04575122,
        cad: 0.081761,
        aud: 0.089017,
        nzd: 0.098346,
        jpy: 9.01,
        rub: 5.67,
        krw: 81.57,
        idr: 921.76,
        php: 3.43,
        thb: 2,
        vnd: 1503.84,
        inr: 4.97,
        try: 2.03,
        sgd: 0.078095,
      },
    },
    {
      tokenId: "787-evm-native",
      rates: {
        btc: 8.77778e-7,
        eth: 0.00002316,
        dot: 0.01398629,
        usd: 0.059148,
        cny: 0.42062,
        eur: 0.054807,
        gbp: 0.04575122,
        cad: 0.081761,
        aud: 0.089017,
        nzd: 0.098346,
        jpy: 9.01,
        rub: 5.67,
        krw: 81.57,
        idr: 921.76,
        php: 3.43,
        thb: 2,
        vnd: 1503.84,
        inr: 4.97,
        try: 2.03,
        sgd: 0.078095,
      },
    },
    {
      tokenId: "acala-substrate-native",
      rates: {
        btc: 8.77778e-7,
        eth: 0.00002316,
        dot: 0.01398629,
        usd: 0.059148,
        cny: 0.42062,
        eur: 0.054807,
        gbp: 0.04575122,
        cad: 0.081761,
        aud: 0.089017,
        nzd: 0.098346,
        jpy: 9.01,
        rub: 5.67,
        krw: 81.57,
        idr: 921.76,
        php: 3.43,
        thb: 2,
        vnd: 1503.84,
        inr: 4.97,
        try: 2.03,
        sgd: 0.078095,
      },
    },
    {
      tokenId: "astar-substrate-assets-18446744073709551616-aca",
      rates: {
        btc: 8.77778e-7,
        eth: 0.00002316,
        dot: 0.01398629,
        usd: 0.059148,
        cny: 0.42062,
        eur: 0.054807,
        gbp: 0.04575122,
        cad: 0.081761,
        aud: 0.089017,
        nzd: 0.098346,
        jpy: 9.01,
        rub: 5.67,
        krw: 81.57,
        idr: 921.76,
        php: 3.43,
        thb: 2,
        vnd: 1503.84,
        inr: 4.97,
        try: 2.03,
        sgd: 0.078095,
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
        id: "acala-substrate-tokens-aseed",
      },
      {
        id: "acala-substrate-tokens-tap",
      },
      {
        id: "acala-substrate-tokens-lcdot",
      },
      {
        id: "acala-substrate-tokens-ldot",
      },
      {
        id: "acala-substrate-tokens-dot",
      },
      {
        id: "acala-substrate-tokens-eqd",
      },
      {
        id: "acala-substrate-tokens-intr",
      },
      {
        id: "acala-substrate-tokens-weth",
      },
      {
        id: "acala-substrate-tokens-astr",
      },
      {
        id: "acala-substrate-tokens-pha",
      },
      {
        id: "acala-substrate-tokens-para",
      },
      {
        id: "acala-substrate-tokens-glmr",
      },
      {
        id: "acala-substrate-tokens-wbtc",
      },
      {
        id: "acala-substrate-tokens-eq",
      },
      {
        id: "acala-substrate-tokens-ibtc",
      },
      {
        id: "acala-substrate-tokens-pink",
      },
      {
        id: "acala-substrate-tokens-tdot",
      },
      {
        id: "acala-substrate-tokens-usdcet",
      },
      {
        id: "acala-substrate-tokens-ape",
      },
      {
        id: "acala-substrate-tokens-dai",
      },
      {
        id: "acala-substrate-tokens-lp-aseed-ldot",
      },
      {
        id: "acala-substrate-tokens-lp-aseed-ibtc",
      },
      {
        id: "acala-substrate-tokens-lp-aseed-lcdot",
      },
      {
        id: "acala-substrate-tokens-lp-aca-aseed",
      },
      {
        id: "acala-substrate-tokens-lp-dot-lcdot",
      },
      {
        id: "acala-substrate-tokens-lp-aseed-intr",
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
