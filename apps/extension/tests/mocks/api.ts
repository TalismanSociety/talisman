import { DbTokenRates } from "@talismn/token-rates"

import type {
  AuthorizedSite,
  AuthorizedSites,
  BalanceSubscriptionResponse,
  ProviderType,
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

export const api = {
  api: {
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
    authorizedSitesSubscribe: jest
      .fn()
      .mockImplementation((cb: (site: AuthorizedSites) => void) => {
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
    balances: jest
      .fn()
      .mockImplementation((cb: (balances: BalanceSubscriptionResponse) => void) => {
        cb({
          status: "initialising",
          data: [],
        })
      }),
    chains: jest.fn().mockImplementation((cb: () => void) => () => undefined),
    ethereumNetworks: jest.fn().mockImplementation((cb: () => void) => () => undefined),
    tokens: jest.fn().mockImplementation((cb: () => void) => () => undefined),
    tokenRates: jest.fn(getMockTokenRates),
  },
}

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
