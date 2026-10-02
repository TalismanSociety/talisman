import { isTalismanHostname } from "@core/util/isTalismanHostname"
import { isAddressEqual } from "@talismn/crypto"
import { assert } from "@talismn/util"

import { SubscribableStorageProvider } from "../../libs/Store"
import { urlToDomain } from "../../util/urlToDomain"
import type { AuthorizedSite, AuthorizedSites, ProviderType } from "./types"

const OLD_AUTH_URLS_KEY = "authUrls"

const PROVIDER_ADDRESSES_KEY = {
  polkadot: "addresses",
  ethereum: "ethAddresses",
  solana: "solAddresses",
} as const satisfies Record<ProviderType, keyof AuthorizedSite>

const PROVIDER_KEYS = {
  polkadot: ["addresses", "connectAllSubstrate"],
  ethereum: ["ethAddresses", "ethPermissions", "ethChainId"],
  solana: ["solAddresses"],
} as const satisfies Record<ProviderType, readonly (keyof AuthorizedSite)[]>

const isTalismanWebAppSubstrate = (host: string, type: ProviderType) =>
  type === "polkadot" && isTalismanHostname(host)

const forgetProvider = (sites: AuthorizedSites, id: string, type: ProviderType) => {
  const remaining = { ...sites[id] }
  for (const key of PROVIDER_KEYS[type]) delete remaining[key]

  if (Object.values(PROVIDER_ADDRESSES_KEY).some((key) => remaining[key])) sites[id] = remaining
  else delete sites[id]
}

// exported only for test purposes
/** @knipignore exported for test mocks */
export class SitesAuthorizedStore extends SubscribableStorageProvider<
  AuthorizedSites,
  "pri(sites.subscribe)"
> {
  constructor(initialData: AuthorizedSites = {}) {
    super("sitesAuthorized", initialData)

    // One time migration to retrieve previously set authorizations and
    // save them to the new SitesAuthorisationStore
    // this code can be removed at some point after Beta launch when we're confident
    // all alpha users have upgraded
    chrome.storage.local.get(OLD_AUTH_URLS_KEY).then(async (result) => {
      // test if migration required
      if (!result) return
      if (Object.keys(await this.get()).length !== 0) return

      // migrate
      const previousData = JSON.parse(result[OLD_AUTH_URLS_KEY] ? result[OLD_AUTH_URLS_KEY] : "{}")
      this.set(previousData)

      // clear data from previous store
      chrome.storage.local.remove(OLD_AUTH_URLS_KEY)
    })
  }

  getSiteFromUrl(url: string): Promise<AuthorizedSite> {
    const { val, err } = urlToDomain(url)
    if (err) throw new Error(val)

    return this.get(val)
  }

  public async ensureUrlAuthorized(
    url: string,
    ethereum: boolean,
    address?: string
  ): Promise<boolean> {
    const entry = await this.getSiteFromUrl(url)
    const addresses = ethereum ? entry?.ethAddresses : entry?.addresses
    assert(addresses, `Site ${url} has not been authorised for Talisman yet`)
    assert(addresses.length, `No Talisman wallet accounts are authorised to connect to ${url}`)

    // check the supplied address is authorised to interact with this URL
    if (address)
      assert(
        addresses.some((addr) => isAddressEqual(addr, address)),
        `The source ${url} is not allowed to interact with this account.`
      )
    return true
  }

  async forgetSite(id: string, type: ProviderType) {
    await this.mutate((sites) => {
      forgetProvider(sites, id, type)
      return sites
    })
  }

  // called after removing an account from keyring, for cleanup purposes
  async forgetAccount(address: string) {
    await this.mutate((sites) => {
      for (const site of Object.values(sites))
        for (const key of Object.values(PROVIDER_ADDRESSES_KEY))
          site[key] = site[key]?.filter((a) => a !== address)
      return sites
    })
  }

  async updateSite(id: string, props: Partial<AuthorizedSite>) {
    await this.mutate((sites) => {
      sites[id] = {
        ...sites[id],
        ...props,
      }
      return sites
    })
  }

  async forgetAllSites(type: ProviderType) {
    await this.mutate((sites) => {
      for (const host of Object.keys(sites))
        if (!isTalismanWebAppSubstrate(host, type)) forgetProvider(sites, host, type)
      return sites
    })
  }

  async disconnectAllSites(type: ProviderType) {
    const key = PROVIDER_ADDRESSES_KEY[type]
    await this.mutate((sites) => {
      for (const [host, site] of Object.entries(sites))
        if (site[key] && !isTalismanWebAppSubstrate(host, type)) site[key] = []
      return sites
    })
  }
}
const sitesAuthorisedStore = new SitesAuthorizedStore()
export default sitesAuthorisedStore
