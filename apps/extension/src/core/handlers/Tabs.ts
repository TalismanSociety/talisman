import { PHISHING_PAGE_REDIRECT } from "@common/constants"
import { log } from "@common/log"
import { isTalismanUrl } from "@core/util/isTalismanUrl"
import { assert } from "@talismn/util"
import { combineLatest } from "rxjs"
import { sentry } from "../config/sentry"
import { db } from "../db"
import { filterAccountsByAddresses, getPublicAccounts } from "../domains/accounts/helpers"
import type { RequestAccountList } from "../domains/accounts/types"
import { getPhishingSource, type PhishingSource } from "../domains/app/protector"
import { maliciousOrigin$, requestSiteScan } from "../domains/app/protector/blockaidSiteScan"
import { shouldScanSite } from "../domains/app/protector/shouldScanSite"
import type { SettingsStoreData } from "../domains/app/store.settings"
import { EthTabsHandler } from "../domains/ethereum"
import { keyringStore } from "../domains/keyring/store"
import { getMetadataDef } from "../domains/metadata/getMetadataDef"
import { requestSubstrateSign, requestVrfSign } from "../domains/signing/requests"
import type {
  SubstrateSignResponse,
  VrfSignPayload,
  VrfSignResponse,
} from "../domains/signing/types"
import { parseVrfSignPayload } from "../domains/signing/vrf"
import { requestAuthoriseSite } from "../domains/sitesAuthorised/requests"
import type {
  AuthorizedSite,
  AuthorizedSites,
  RequestAuthorizeTab,
} from "../domains/sitesAuthorised/types"
import { SolanaTabsHandler } from "../domains/solana/handler.tabs"
import TalismanHandler from "../domains/talisman/handler"
import { talismanAnalytics } from "../libs/Analytics"
import { TabsHandler } from "../libs/Handler"
import { chaindataProvider } from "../rpcs/chaindata"
import type { MessageTypes, RequestType, ResponseType } from "../types"
import type { Port } from "../types/base"
import type {
  InjectedAccount,
  InjectedMetadataKnown,
  MetadataDef,
  SignerPayloadJSON,
  SignerPayloadRaw,
} from "../types/pjsInterop"
import { urlToDomain } from "../util/urlToDomain"
import type { TabStore } from "./stores"
import { genericAsyncSubscription } from "./subscriptions"

export default class Tabs extends TabsHandler {
  readonly #routes: Record<string, TabsHandler> = {}

  constructor(stores: TabStore) {
    super(stores)
    maliciousOrigin$.subscribe((origin) => {
      this.redirectMaliciousOrigin(origin).catch((err) => sentry.captureException(err))
    })

    // routing to sub-handlers
    this.#routes = {
      eth: new EthTabsHandler(stores),
      solana: new SolanaTabsHandler(stores),
      // TODO rename eth => ethereum (requires changing prefix in all requests)
      talisman: new TalismanHandler(stores),
    }
  }

  private async authorize(url: string, request: RequestAuthorizeTab, port: Port): Promise<boolean> {
    let siteFromUrl: AuthorizedSite | undefined
    try {
      siteFromUrl = await this.stores.sites.getSiteFromUrl(url)
    } catch (error) {
      // means that the url is not valid
      log.error(error)
      return false
    }
    // site may exist if created during a connection with EVM API
    if (siteFromUrl?.addresses) {
      // this url was seen in the past
      assert(
        siteFromUrl.addresses?.length,
        `No Talisman wallet accounts are authorised to connect to ${url}`
      )

      return false
    }
    try {
      await requestAuthoriseSite(url, request, port)
    } catch (err) {
      log.error(err)
      return false
    }
    return true
  }

  async #getFilteredAccounts(
    site: AuthorizedSite,
    { anyType }: RequestAccountList,
    developerMode: boolean
  ) {
    return getPublicAccounts(
      await keyringStore.getAccounts(),
      filterAccountsByAddresses(site.addresses, anyType),
      { developerMode, includePortalOnlyInfo: isTalismanUrl(site.url) }
    )
  }

  private async accountsList(url: string, request: RequestAccountList): Promise<InjectedAccount[]> {
    // biome-ignore lint/suspicious/noImplicitAnyLet: legacy
    let site
    try {
      site = await this.stores.sites.getSiteFromUrl(url)
    } catch {
      // means url is not a valid one
      return []
    }
    const { addresses } = site
    if (!addresses || addresses.length === 0) return []

    const developerMode = await this.stores.settings.get("developerMode")

    return this.#getFilteredAccounts(site, request, developerMode)
  }

  private accountsSubscribe(url: string, id: string, port: Port) {
    return genericAsyncSubscription<"pub(accounts.subscribe)">(
      id,
      port,
      combineLatest([this.stores.sites.observable, this.stores.settings.observable]),
      async ([sites, settings]: [AuthorizedSites, SettingsStoreData]) => {
        const { val: siteId, ok } = urlToDomain(url)
        if (!ok) return []

        const site = sites[siteId]
        if (!site?.addresses) return []

        return await this.#getFilteredAccounts(site, { anyType: true }, settings.developerMode)
      }
    )
  }

  private async bytesSign(
    url: string,
    request: SignerPayloadRaw,
    port: Port
  ): Promise<SubstrateSignResponse> {
    const address = request.address

    const account = await keyringStore.getAccount(address)
    if (!account) throw new Error("Account not found")

    return requestSubstrateSign(url, { payload: request }, account, port)
  }

  private async extrinsicSign(
    url: string,
    request: SignerPayloadJSON,
    port: Port
  ): Promise<SubstrateSignResponse> {
    const address = request.address

    const account = await keyringStore.getAccount(address)
    if (!account) throw new Error("Account not found")

    return requestSubstrateSign(url, { payload: request }, account, port)
  }

  private async vrfSign(
    url: string,
    request: VrfSignPayload,
    port: Port
  ): Promise<VrfSignResponse> {
    // reject malformed payloads here so they never reach the approval popup
    parseVrfSignPayload(request)

    const account = await keyringStore.getAccount(request.address)
    if (!account) throw new Error("Account not found")

    // VRF signing needs the raw secret key: hardware/vault/watch-only accounts can't do it
    assert(
      account.type === "keypair" && account.curve === "sr25519",
      "VRF signing requires a local sr25519 account"
    )

    return requestVrfSign(url, { payload: request }, account, port)
  }

  private metadataProvide(request: MetadataDef): boolean {
    // Dapp-supplied metadata is never stored or trusted: it would decide how transactions are
    // rendered on the sign screen while the bytes actually signed are the dapp's own payload.
    // Refresh our own chain-fetched copy instead, which is what the dapp is really asking for,
    // and report success so it doesn't block on a metadata update that will never come from it.
    if (request.genesisHash)
      getMetadataDef(request.genesisHash).catch((cause) =>
        log.warn("Failed to refresh metadata", { genesisHash: request.genesisHash, cause })
      )

    return true
  }

  private async metadataList(): Promise<InjectedMetadataKnown[]> {
    // this is called by dapps to determine whether they should force the wallet to update metadata before submitting a tx (we can't know on which chain up front)
    // we dont want this metadata as it's not the full one, so it's an UX overhead we want to avoid
    // => return the spec version of all chains for which we know how to connect, plus the ones for which we have the metadata in db
    const [chains, metadata] = await Promise.all([
      chaindataProvider.getNetworks("polkadot"),
      db.metadata.toArray(),
    ])

    const dicSpecVersions = [...chains.filter(({ rpcs }) => rpcs?.length), ...metadata].reduce(
      (acc, { genesisHash, specVersion }) => {
        if (genesisHash && specVersion)
          acc[genesisHash] = Math.max(acc[genesisHash] ?? 0, Number(specVersion))
        return acc
      },
      {} as Record<string, number>
    )

    return Object.entries(dicSpecVersions).map(([genesisHash, specVersion]) => ({
      genesisHash,
      specVersion,
    }))
  }

  private async isEthereumConnected(url: string): Promise<boolean> {
    try {
      const site = await this.stores.sites.getSiteFromUrl(url)
      return !!site?.ethAddresses?.length
    } catch {
      return false
    }
  }

  private phishingLandingUrl(phishingWebsite: string, source: PhishingSource): string {
    const dashboard = chrome.runtime.getURL("dashboard.html")
    const website = encodeURIComponent(phishingWebsite.split("#")[0])
    return `${dashboard}#${PHISHING_PAGE_REDIRECT}/${website}?source=${source}`
  }

  private reportPhishingRedirect(url: string, source: PhishingSource): void {
    const properties = { url, source }
    sentry.captureEvent({ message: "Redirect from phishing site", extra: properties })
    talismanAnalytics.capture("Redirect from phishing site", properties)
  }

  private async redirectToPhishingPage(
    tabs: chrome.tabs.Tab[],
    source: PhishingSource
  ): Promise<void> {
    await Promise.all(
      tabs.map(async ({ id, url: tabUrl }) => {
        if (typeof id !== "number" || !tabUrl) return
        const url = this.phishingLandingUrl(tabUrl, source)
        await chrome.tabs
          .update(id, { url })
          .catch((err) => sentry.captureException(err, { extra: { url } }))
      })
    )
  }

  private async redirectMaliciousOrigin(origin: string): Promise<void> {
    const tabs = (await chrome.tabs.query({ url: `${origin}/*` })).filter(
      ({ url }) => url && new URL(url).origin === origin
    )
    for (const { url } of tabs) if (url) this.reportPhishingRedirect(url, "blockaid")
    await this.redirectToPhishingPage(tabs, "blockaid")
  }

  private async redirectIfPhishing(url: string): Promise<boolean> {
    const source = await getPhishingSource(url)
    if (!source) return false

    this.reportPhishingRedirect(url, source)
    chrome.tabs
      .query({ url: url.split("#")[0] })
      .then((tabs) => this.redirectToPhishingPage(tabs, source))
      .catch((err) => sentry.captureException(err))
    return true
  }

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestType<TMessageType>,
    port: Port,
    url: string
  ): Promise<ResponseType<TMessageType>> {
    if (type === "pub(phishing.redirectIfDenied)") {
      return this.redirectIfPhishing(url)
    }
    // Always check for onboarding before doing anything else
    // Because of chrome extensions can be synchronised on multiple computers,
    // Talisman may be installed on computers where user do not want to onboard
    // => Do not trigger onboarding, just throw an error
    await this.stores.app.ensureOnboarded()

    // check for phishing on all requests
    const isPhishing = await this.redirectIfPhishing(url)
    if (isPhishing) return

    if (await shouldScanSite(type, request, () => this.isEthereumConnected(url)))
      requestSiteScan(url)

    // --------------------------------------------------------------------
    // Then try known sub-handlers based on prefix of message ------------
    // --------------------------------------------------------------------
    try {
      const routeKey = type.split("pub(")[1].split(".")[0]
      const subhandler = this.#routes[routeKey]
      if (subhandler) return subhandler.handle(id, type, request, port, url)
    } catch {
      throw new Error(`Unable to handle message of type ${type}`)
    }

    // check for authorisation if message is not to authorise, else authorise
    if (type !== "pub(authorize.tab)") {
      await this.stores.sites.ensureUrlAuthorized(url, false)
    } else {
      return this.authorize(url, request as RequestAuthorizeTab, port)
    }

    switch (type) {
      case "pub(accounts.list)":
        return this.accountsList(url, request as RequestAccountList)

      case "pub(accounts.subscribe)":
        return this.accountsSubscribe(url, id, port)

      case "pub(accounts.unsubscribe)":
        // noop, needed to comply with polkadot.js behaviour
        return true

      case "pub(bytes.sign)":
        await this.stores.sites.ensureUrlAuthorized(
          url,
          false,
          (request as SignerPayloadRaw).address
        )
        return this.bytesSign(url, request as SignerPayloadRaw, port)

      case "pub(extrinsic.sign)":
        await this.stores.sites.ensureUrlAuthorized(
          url,
          false,
          (request as SignerPayloadJSON).address
        )
        return this.extrinsicSign(url, request as SignerPayloadJSON, port)

      case "pub(vrf.sign)":
        await this.stores.sites.ensureUrlAuthorized(url, false, (request as VrfSignPayload).address)
        return this.vrfSign(url, request as VrfSignPayload, port)

      case "pub(metadata.list)":
        return this.metadataList()

      case "pub(metadata.provide)":
        return this.metadataProvide(request as MetadataDef)

      case "pub(ping)":
        return Promise.resolve(true)

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
