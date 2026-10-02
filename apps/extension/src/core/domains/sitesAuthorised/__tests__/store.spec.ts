import { TALISMAN_WEB_APP_DOMAIN } from "@common/constants"
import { afterEach, beforeEach, describe, expect, test } from "vitest"

import { SitesAuthorizedStore } from "../store"
import type { AuthorizedSite, AuthorizedSites, ProviderType } from "../types"

const CONNECTIONS = {
  polkadot: { addresses: ["5Substrate"], connectAllSubstrate: false },
  ethereum: {
    ethAddresses: ["0xEthereum"],
    ethPermissions: { eth_accounts: { date: 1, id: "permission" } },
    ethChainId: 1,
  },
  solana: { solAddresses: ["Solana1111"] },
} satisfies Record<ProviderType, Partial<AuthorizedSite>>

const PROVIDERS = Object.keys(CONNECTIONS) as ProviderType[]

const ADDRESSES_KEY = {
  polkadot: "addresses",
  ethereum: "ethAddresses",
  solana: "solAddresses",
} as const satisfies Record<ProviderType, keyof AuthorizedSite>

const PROVIDER_COMBINATIONS: ProviderType[][] = [
  ["polkadot"],
  ["ethereum"],
  ["solana"],
  ["polkadot", "ethereum"],
  ["polkadot", "solana"],
  ["ethereum", "solana"],
  ["polkadot", "ethereum", "solana"],
]

const siteId = (providers: ProviderType[]) => `${providers.join("-")}.example`

const createSite = (id: string, providers: ProviderType[]): AuthorizedSite =>
  Object.assign(
    { id, origin: id, url: `https://${id}` },
    ...providers.map((provider) => CONNECTIONS[provider])
  )

const createSites = (combinations: ProviderType[][]): AuthorizedSites =>
  Object.fromEntries(
    combinations.map((providers) => [siteId(providers), createSite(siteId(providers), providers)])
  )

const without = (providers: ProviderType[], provider: ProviderType) =>
  providers.filter((p) => p !== provider)

describe("SitesAuthorizedStore", () => {
  let store: SitesAuthorizedStore

  beforeEach(() => {
    store = new SitesAuthorizedStore()
  })

  afterEach(async () => {
    await chrome.storage.local.clear()
  })

  describe("forgetSite", () => {
    test.each(
      PROVIDERS.flatMap((forgotten) =>
        PROVIDER_COMBINATIONS.filter((providers) => providers.includes(forgotten)).map(
          (providers) => ({ forgotten, providers })
        )
      )
    )(
      "forgetting $forgotten on a $providers site keeps only the other providers",
      async ({ forgotten, providers }) => {
        const id = siteId(providers)
        await store.replace(createSites([providers]))

        await store.forgetSite(id, forgotten)

        const remaining = without(providers, forgotten)
        expect(await store.get(id)).toEqual(
          remaining.length ? createSite(id, remaining) : undefined
        )
      }
    )
  })

  describe("forgetAllSites", () => {
    test.each(PROVIDERS)(
      "forgetting all %s sites keeps the other providers' connections",
      async (forgotten) => {
        await store.replace(createSites(PROVIDER_COMBINATIONS))

        await store.forgetAllSites(forgotten)

        expect(await store.get()).toEqual(
          Object.fromEntries(
            PROVIDER_COMBINATIONS.map((providers) => without(providers, forgotten))
              .map((remaining, i) => [siteId(PROVIDER_COMBINATIONS[i]), remaining] as const)
              .filter(([, remaining]) => remaining.length)
              .map(([id, remaining]) => [id, createSite(id, remaining)])
          )
        )
      }
    )

    test("forgetting all Polkadot sites keeps the Talisman web app", async () => {
      const webApp = createSite(TALISMAN_WEB_APP_DOMAIN, PROVIDERS)
      await store.replace({ [TALISMAN_WEB_APP_DOMAIN]: webApp })

      await store.forgetAllSites("polkadot")

      expect(await store.get(TALISMAN_WEB_APP_DOMAIN)).toEqual(webApp)
    })

    test.each(["ethereum", "solana"] as const)(
      "forgetting all %s sites forgets the Talisman web app's connection",
      async (forgotten) => {
        await store.replace({
          [TALISMAN_WEB_APP_DOMAIN]: createSite(TALISMAN_WEB_APP_DOMAIN, PROVIDERS),
        })

        await store.forgetAllSites(forgotten)

        expect(await store.get(TALISMAN_WEB_APP_DOMAIN)).toEqual(
          createSite(TALISMAN_WEB_APP_DOMAIN, without(PROVIDERS, forgotten))
        )
      }
    )
  })

  describe("disconnectAllSites", () => {
    test.each(PROVIDERS)(
      "disconnecting all %s sites empties only that provider's addresses",
      async (disconnected) => {
        await store.replace(createSites(PROVIDER_COMBINATIONS))

        await store.disconnectAllSites(disconnected)

        const actual = await store.get()
        for (const providers of PROVIDER_COMBINATIONS) {
          const id = siteId(providers)
          const expected = createSite(id, providers)
          if (providers.includes(disconnected)) expected[ADDRESSES_KEY[disconnected]] = []
          expect(actual[id]).toEqual(expected)
        }
      }
    )

    test("disconnecting all Polkadot sites keeps the Talisman web app connected", async () => {
      const webApp = createSite(TALISMAN_WEB_APP_DOMAIN, PROVIDERS)
      await store.replace({ [TALISMAN_WEB_APP_DOMAIN]: webApp })

      await store.disconnectAllSites("polkadot")

      expect(await store.get(TALISMAN_WEB_APP_DOMAIN)).toEqual(webApp)
    })
  })

  describe("forgetAccount", () => {
    test.each(PROVIDERS)("removes the account from %s connections", async (provider) => {
      const id = siteId(PROVIDERS)
      await store.replace(createSites([PROVIDERS]))
      const address = CONNECTIONS[provider][ADDRESSES_KEY[provider]][0]

      await store.forgetAccount(address)

      expect((await store.get(id))[ADDRESSES_KEY[provider]]).toEqual([])
    })
  })
})
