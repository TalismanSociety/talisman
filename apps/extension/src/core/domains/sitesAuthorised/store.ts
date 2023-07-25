import { TALISMAN_WEB_APP_DOMAIN } from "@core/constants"
import { AuthorizedSite, AuthorizedSites, ProviderType } from "@core/domains/sitesAuthorised/types"
import { SubscribableByIdStorageProvider } from "@core/libs/Store"
import { urlToDomain } from "@core/util/urlToDomain"
import { assert } from "@polkadot/util"
import { convertAddress } from "@talisman/util/convertAddress"
import Browser from "webextension-polyfill"

const OLD_AUTH_URLS_KEY = "authUrls"

export class SitesAuthorizedStore extends SubscribableByIdStorageProvider<
  AuthorizedSites,
  "pri(sites.subscribe)",
  "pri(sites.byid.subscribe)"
> {
  constructor(initialData: AuthorizedSites = {}) {
    super("sitesAuthorized", initialData)

    // One time migration to retrieve previously set authorizations and
    // save them to the new SitesAuthorisationStore
    // this code can be removed at some point after Beta launch when we're confident
    // all alpha users have upgraded
    Browser.storage.local.get(OLD_AUTH_URLS_KEY).then(async (result) => {
      // test if migration required
      if (!result) return
      if (Object.keys(await this.get()).length !== 0) return

      // migrate
      const previousData = JSON.parse(result[OLD_AUTH_URLS_KEY] ? result[OLD_AUTH_URLS_KEY] : "{}")
      this.set(previousData)

      // clear data from previous store
      Browser.storage.local.remove(OLD_AUTH_URLS_KEY)
    })
  }

  async getSiteFromUrl(url: string): Promise<AuthorizedSite> {
    const { val, err } = urlToDomain(url)
    if (err) throw new Error(val)

    const site = await this.get(val)

    return { ...site, connectWatchedAccounts: site.url.includes(TALISMAN_WEB_APP_DOMAIN) }
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
        addresses.includes(convertAddress(address, null)),
        `The source ${url} is not allowed to intract with this account.`
      )
    return true
  }

  async forgetSite(id: string, type: ProviderType) {
    const site = await this.get(id)
    if (type === "polkadot" && site?.ethAddresses)
      await this.updateSite(id, { addresses: undefined, connectAllSubstrate: undefined })
    else if (type === "ethereum" && site?.addresses)
      await this.updateSite(id, {
        ethAddresses: undefined,
        ethPermissions: undefined,
        ethChainId: undefined,
      })
    else await this.delete(id)
  }

  // called after removing an account from keyring, for cleanup purposes
  async forgetAccount(address: string) {
    await this.mutate((sites) => {
      for (const [key, { addresses, ethAddresses }] of Object.entries(sites)) {
        sites[key].addresses = addresses?.filter((a) => a !== address)
        sites[key].ethAddresses = ethAddresses?.filter((a) => a !== address)
      }
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
}
const sitesAuthorisedStore = new SitesAuthorizedStore()
export default sitesAuthorisedStore
