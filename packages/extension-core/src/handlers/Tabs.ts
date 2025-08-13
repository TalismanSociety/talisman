import type {
  InjectedAccount,
  InjectedMetadataKnown,
  MetadataDef,
  ProviderMeta,
} from "@polkadot/extension-inject/types"
import type { SignerPayloadJSON, SignerPayloadRaw } from "@polkadot/types/types"
import RequestBytesSign from "@polkadot/extension-base/background/RequestBytesSign"
import RequestExtrinsicSign from "@polkadot/extension-base/background/RequestExtrinsicSign"
import {
  RequestRpcSend,
  RequestRpcSubscribe,
  RequestRpcUnsubscribe,
  ResponseRpcListProviders,
} from "@polkadot/extension-base/background/types"
import { PHISHING_PAGE_REDIRECT } from "@polkadot/extension-base/defaults"
import { assert, isNumber } from "@polkadot/util"
import { isTalismanUrl, log } from "extension-shared"
import { combineLatest } from "rxjs"

import type { MessageTypes, RequestType, ResponseType, SubscriptionMessageTypes } from "../types"
import type { Port } from "../types/base"
import { sentry } from "../config/sentry"
import { db } from "../db"
import { filterAccountsByAddresses, getPublicAccounts } from "../domains/accounts/helpers"
import { RequestAccountList } from "../domains/accounts/types"
import { protector } from "../domains/app/protector"
import { SettingsStoreData } from "../domains/app/store.settings"
import { requestDecrypt, requestEncrypt } from "../domains/encrypt/requests"
import {
  DecryptPayload,
  DecryptResult,
  EncryptPayload,
  EncryptResult,
  ResponseEncryptDecrypt,
  ResponseEncryptEncrypt,
} from "../domains/encrypt/types"
import { EthTabsHandler } from "../domains/ethereum"
import { keyringStore } from "../domains/keyring/store"
import { requestInjectMetadata } from "../domains/metadata/requests"
import { signSubstrate } from "../domains/signing/requests"
import { requestAuthoriseSite } from "../domains/sitesAuthorised/requests"
import {
  AuthorizedSite,
  AuthorizedSites,
  RequestAuthorizeTab,
} from "../domains/sitesAuthorised/types"
import { SolanaTabsHandler } from "../domains/solana/handler.tabs"
import TalismanHandler from "../domains/talisman/handler"
import { UnknownJsonRpcResponse } from "../domains/talisman/types"
import { talismanAnalytics } from "../libs/Analytics"
import { TabsHandler } from "../libs/Handler"
import { chaindataProvider } from "../rpcs/chaindata"
import { SubstrateSignResponse } from "../types/domains"
import { urlToDomain } from "../util/urlToDomain"
import RpcState from "./RpcState"
import { TabStore } from "./stores"
import { createSubscription, genericAsyncSubscription, unsubscribe } from "./subscriptions"

export default class Tabs extends TabsHandler {
  #rpcState = new RpcState()
  readonly #routes: Record<string, TabsHandler> = {}

  constructor(stores: TabStore) {
    super(stores)

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
        `No Talisman wallet accounts are authorised to connect to ${url}`,
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
    developerMode: boolean,
  ) {
    return getPublicAccounts(
      await keyringStore.getAccounts(),
      filterAccountsByAddresses(site.addresses, anyType),
      { developerMode, includePortalOnlyInfo: isTalismanUrl(site.url) },
    )
  }

  private async accountsList(url: string, request: RequestAccountList): Promise<InjectedAccount[]> {
    let site
    try {
      site = await this.stores.sites.getSiteFromUrl(url)
    } catch (error) {
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
        if (!site || !site.addresses) return []

        return await this.#getFilteredAccounts(site, { anyType: true }, settings.developerMode)
      },
    )
  }

  private async bytesSign(
    url: string,
    request: SignerPayloadRaw,
    port: Port,
  ): Promise<SubstrateSignResponse> {
    const address = request.address

    const account = await keyringStore.getAccount(address)
    if (!account) throw new Error("Account not found")

    return signSubstrate(url, new RequestBytesSign(request), account, port)
  }

  private async extrinsicSign(
    url: string,
    request: SignerPayloadJSON,
    port: Port,
  ): Promise<SubstrateSignResponse> {
    const address = request.address

    const account = await keyringStore.getAccount(address)
    if (!account) throw new Error("Account not found")

    return signSubstrate(url, new RequestExtrinsicSign(request), account, port)
  }

  private async messageEncrypt(
    url: string,
    request: EncryptPayload,
    port: Port,
  ): Promise<ResponseEncryptEncrypt> {
    const account = await keyringStore.getAccount(request.address)
    if (!account) throw new Error("Account not found")

    return requestEncrypt(url, request, account, port)
  }

  private async messageDecrypt(
    url: string,
    request: DecryptPayload,
    port: Port,
  ): Promise<ResponseEncryptDecrypt> {
    const account = await keyringStore.getAccount(request.address)
    if (!account) throw new Error("Account not found")

    return requestDecrypt(url, request, account, port)
  }

  private metadataProvide(url: string, request: MetadataDef, port: Port): Promise<boolean> {
    return requestInjectMetadata(url, request, port)
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
      {} as Record<string, number>,
    )

    return Object.entries(dicSpecVersions).map(([genesisHash, specVersion]) => ({
      genesisHash,
      specVersion,
    }))
  }

  private rpcListProviders(): Promise<ResponseRpcListProviders> {
    return this.#rpcState.rpcListProviders()
  }

  private rpcSend(request: RequestRpcSend, port: Port): Promise<UnknownJsonRpcResponse> {
    return this.#rpcState.rpcSend(request, port)
  }

  private rpcStartProvider(key: string, port: Port): Promise<ProviderMeta> {
    return this.#rpcState.rpcStartProvider(key, port)
  }

  private async rpcSubscribe(
    request: RequestRpcSubscribe,
    id: string,
    port: Port,
  ): Promise<boolean> {
    const innerCb = createSubscription<"pub(rpc.subscribe)">(id, port)
    const cb = (_error: Error | null, data: SubscriptionMessageTypes["pub(rpc.subscribe)"]): void =>
      innerCb(data)
    const subscriptionId = await this.#rpcState.rpcSubscribe(request, cb, port)

    port.onDisconnect.addListener((): void => {
      unsubscribe(id)
      this.rpcUnsubscribe({ ...request, subscriptionId }, port).catch(sentry.captureException)
    })

    return true
  }

  private rpcSubscribeConnected(request: null, id: string, port: Port): Promise<boolean> {
    const innerCb = createSubscription<"pub(rpc.subscribeConnected)">(id, port)
    const cb = (
      _error: Error | null,
      data: SubscriptionMessageTypes["pub(rpc.subscribeConnected)"],
    ): void => innerCb(data)

    this.#rpcState.rpcSubscribeConnected(request, cb, port)

    port.onDisconnect.addListener((): void => {
      unsubscribe(id)
    })

    return Promise.resolve(true)
  }

  private rpcUnsubscribe(request: RequestRpcUnsubscribe, port: Port): Promise<boolean> {
    return this.#rpcState.rpcUnsubscribe(request, port)
  }

  private redirectPhishingLanding(phishingWebsite: string): void {
    const nonFragment = phishingWebsite.split("#")[0]
    const encodedWebsite = encodeURIComponent(nonFragment)
    const url = `${chrome.runtime.getURL(
      "dashboard.html",
    )}#${PHISHING_PAGE_REDIRECT}/${encodedWebsite}`

    chrome.tabs.query({ url: nonFragment }).then((tabs) => {
      tabs
        .map(({ id }) => id)
        .filter((id): id is number => isNumber(id))
        .forEach((id) =>
          chrome.tabs.update(id, { url }).catch((err: Error) => {
            // eslint-disable-next-line no-console
            console.error("Failed to redirect tab to phishing page", { err })
            sentry.captureException(err, { extra: { url } })
          }),
        )
    })
  }

  private async redirectIfPhishing(url: string): Promise<boolean> {
    const isInDenyList = await protector.isPhishingSite(url)

    if (isInDenyList) {
      sentry.captureEvent({
        message: "Redirect from phishing site",
        extra: { url },
      })
      talismanAnalytics.capture("Redirect from phishing site", { url })
      this.redirectPhishingLanding(url)

      return true
    }

    return false
  }

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestType<TMessageType>,
    port: Port,
    url: string,
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

    // --------------------------------------------------------------------
    // Then try known sub-handlers based on prefix of message ------------
    // --------------------------------------------------------------------
    try {
      const routeKey = type.split("pub(")[1].split(".")[0]
      const subhandler = this.#routes[routeKey]
      if (subhandler) return subhandler.handle(id, type, request, port, url)
    } catch (e) {
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
          (request as SignerPayloadRaw).address,
        )
        return this.bytesSign(url, request as SignerPayloadRaw, port)

      case "pub(extrinsic.sign)":
        await this.stores.sites.ensureUrlAuthorized(
          url,
          false,
          (request as SignerPayloadJSON).address,
        )
        return this.extrinsicSign(url, request as SignerPayloadJSON, port)

      case "pub(metadata.list)":
        return this.metadataList()

      case "pub(metadata.provide)":
        return this.metadataProvide(url, request as MetadataDef, port)

      case "pub(rpc.listProviders)":
        return this.rpcListProviders()

      case "pub(rpc.send)":
        return this.rpcSend(request as RequestRpcSend, port)

      case "pub(rpc.startProvider)":
        return this.rpcStartProvider(request as string, port)

      case "pub(rpc.subscribe)":
        return this.rpcSubscribe(request as RequestRpcSubscribe, id, port)

      case "pub(rpc.subscribeConnected)":
        return this.rpcSubscribeConnected(request as null, id, port)

      case "pub(rpc.unsubscribe)":
        return this.rpcUnsubscribe(request as RequestRpcUnsubscribe, port)

      case "pub(encrypt.encrypt)": {
        await this.stores.sites.ensureUrlAuthorized(url, false, (request as EncryptPayload).address)
        const response = await this.messageEncrypt(url, request as EncryptPayload, port)
        return {
          id: Number(response.id),
          result: response.result,
        } as EncryptResult
      }

      case "pub(encrypt.decrypt)": {
        await this.stores.sites.ensureUrlAuthorized(url, false, (request as DecryptPayload).address)
        const response = await this.messageDecrypt(url, request as DecryptPayload, port)
        return {
          id: Number(response.id),
          result: response.result,
        } as DecryptResult
      }

      case "pub(ping)":
        return Promise.resolve(true)

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
