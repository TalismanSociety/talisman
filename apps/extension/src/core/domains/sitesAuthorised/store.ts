import { AuthorizedSite, AuthorizedSites, ProviderType } from "@core/domains/sitesAuthorised/types"
import { urlToDomain } from "@core/util/urlToDomain"
import { SubscribableByIdStorageProvider } from "@core/libs/Store"
import { assert } from "@polkadot/util"
import Browser from "webextension-polyfill"
import { convertAddress } from "@talisman/util/convertAddress"

const OLD_AUTH_URLS_KEY = "authUrls"

export class SitesAuthorizedStore extends SubscribableByIdStorageProvider<
  AuthorizedSites,
  "pri(sites.subscribe)",
  "pri(sites.byid.subscribe)"
> {
  constructor() {
    super("sitesAuthorized")

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

  async getSiteFromUrl(url: string) {
    const { val, err } = urlToDomain(url)
    if (err) throw new Error(val)

    return await this.get(val)
  }

  public async ensureUrlAuthorized(url: string, ethereum: boolean, address?: string): Promise<boolean> {
    const entry = await this.getSiteFromUrl(url)
    const addresses = ethereum ? entry?.ethAddresses : entry?.addresses
    assert(addresses, `The source ${url} has not been enabled yet`)
    assert(addresses.length, `The source ${url} is not allowed to interact with this extension`)

    // check the supplied address is authorised to interact with this URL
    if (address) assert(addresses.includes(convertAddress(address, null)), `The source ${url} is not allowed to intract with this account.`)
    return true
  }

  async forgetSite(id: string, type: ProviderType) {
    const site = await this.get(id)
    if (type === "polkadot" && site?.ethAddresses)
      await this.updateSite(id, { addresses: undefined })
    else if (type === "ethereum" && site?.addresses)
      await this.updateSite(id, { ethAddresses: undefined })
    else await this.delete(id)
  }

  // called after removing an account from keyring, for cleanup purposes
  forgetAccount(address: string) {
    this.mutate((sites) => {
      for (const [key, { addresses, ethAddresses }] of Object.entries(sites)) {
        sites[key].addresses = addresses?.filter((a) => a !== address)
        sites[key].ethAddresses = ethAddresses?.filter((a) => a !== address)
      }
      return sites
    })
  }

  updateSite(id: string, props: Partial<AuthorizedSite>) {
    this.mutate((sites) => {
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
