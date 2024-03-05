/* eslint-disable @typescript-eslint/no-unused-vars */
import { TALISMAN_WEB_APP_DOMAIN } from "extension-shared"

import { Trees } from "../../src/domains/accounts/helpers.catalog"
import { AccountJsonAny, AccountType } from "../../src/domains/accounts/types"
import { AnalyticsCaptureRequest } from "../../src/domains/app/types"
import { SitesAuthorizedStore } from "../../src/domains/sitesAuthorised/store"
import type {
  AuthorizedSite,
  AuthorizedSites,
  ProviderType,
} from "../../src/domains/sitesAuthorised/types"
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
        (_request: AnalyticsCaptureRequest) => new Promise((resolve) => resolve(true))
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
        sitesStore.updateSite(id, update)
      ),
    authorizedSiteForget: jest
      .fn()
      .mockImplementation((id: string, type: ProviderType) => sitesStore.forgetSite(id, type)),
    balances: jest.fn().mockImplementation((cb: () => void) => () => undefined),
    chains: jest.fn().mockImplementation((cb: () => void) => () => undefined),
    ethereumNetworks: jest.fn().mockImplementation((cb: () => void) => () => undefined),
    tokens: jest.fn().mockImplementation((cb: () => void) => () => undefined),
    tokenRates: jest.fn().mockImplementation((cb: () => void) => () => undefined),
  },
}
