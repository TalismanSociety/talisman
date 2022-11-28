import { filterAccountsByAddresses } from "@core/domains/accounts/helpers"
import { RequestAccountList } from "@core/domains/accounts/types"
import { protector } from "@core/domains/app/protector"
import {
  DecryptPayload,
  EncryptPayload,
  ResponseDecrypt,
  ResponseEncrypt,
} from "@core/domains/encrypt/types"
import { EthTabsHandler } from "@core/domains/ethereum"
import type { ResponseSigning } from "@core/domains/signing/types"
import { RequestAuthorizeTab } from "@core/domains/sitesAuthorised/types"
import State from "@core/handlers/State"
import { TabStore } from "@core/handlers/stores"
import { talismanAnalytics } from "@core/libs/Analytics"
import { db } from "@core/libs/db"
import { TabsHandler } from "@core/libs/Handler"
import type {
  MessageTypes,
  RequestTypes,
  ResponseTypes,
  SubscriptionMessageTypes,
} from "@core/types"
import type { Port } from "@core/types/base"
import { getAccountAvatarDataUri } from "@core/util/getAccountAvatarDataUri"
import { isPhishingSite } from "@core/util/isPhishingSite"
import RequestBytesSign from "@polkadot/extension-base/background/RequestBytesSign"
import RequestExtrinsicSign from "@polkadot/extension-base/background/RequestExtrinsicSign"
import {
  RequestRpcSend,
  RequestRpcSubscribe,
  RequestRpcUnsubscribe,
  ResponseRpcListProviders,
} from "@polkadot/extension-base/background/types"
import { PHISHING_PAGE_REDIRECT } from "@polkadot/extension-base/defaults"
import type {
  InjectedAccount,
  InjectedMetadataKnown,
  MetadataDef,
  ProviderMeta,
} from "@polkadot/extension-inject/types"
import type { KeyringPair } from "@polkadot/keyring/types"
import type { JsonRpcResponse } from "@polkadot/rpc-provider/types"
import type { SignerPayloadJSON, SignerPayloadRaw } from "@polkadot/types/types"
import keyring from "@polkadot/ui-keyring"
import { accounts as accountsObservable } from "@polkadot/ui-keyring/observable/accounts"
import { assert, isNumber } from "@polkadot/util"
import * as Sentry from "@sentry/browser"
import Browser from "webextension-polyfill"

import RpcState from "./RpcState"
import { createSubscription, genericAsyncSubscription, unsubscribe } from "./subscriptions"

export default class Tabs extends TabsHandler {
  #rpcState = new RpcState()
  readonly #routes: Record<string, TabsHandler> = {}

  constructor(state: State, stores: TabStore) {
    super(state, stores)

    // routing to sub-handlers
    this.#routes = {
      eth: new EthTabsHandler(state, stores),
    }
  }

  private async authorize(url: string, request: RequestAuthorizeTab): Promise<boolean> {
    const siteFromUrl = await this.stores.sites.getSiteFromUrl(url)
    if (siteFromUrl?.addresses) {
      // this url was seen in the past
      assert(
        siteFromUrl.addresses?.length,
        `The source ${url} is not allowed to interact with this extension`
      )

      return false
    }

    return await this.state.requestStores.sites.requestAuthorizeUrl(url, request)
  }

  private async accountsList(
    url: string,
    { anyType }: RequestAccountList
  ): Promise<InjectedAccount[]> {
    const addresses = (await this.stores.sites.getSiteFromUrl(url)).addresses
    const accounts = filterAccountsByAddresses(
      accountsObservable.subject.getValue(),
      addresses,
      anyType
    )
    const iconType = await this.stores.settings.get("identiconType")
    return accounts.map((acc) => ({
      ...acc,
      avatar: getAccountAvatarDataUri(acc.address, iconType),
    }))
  }

  private accountsSubscribe(url: string, id: string, port: Port) {
    return genericAsyncSubscription<"pub(accounts.subscribe)">(
      id,
      port,
      this.stores.sites.observable,
      async () => {
        const iconType = await this.stores.settings.get("identiconType")
        const accounts = accountsObservable.subject.getValue()
        const addresses = (await this.stores.sites.getSiteFromUrl(url))?.addresses
        if (!addresses) return []
        const filteredAccounts = await filterAccountsByAddresses(accounts, addresses, true)
        return filteredAccounts.map((acc) => ({
          ...acc,
          avatar: getAccountAvatarDataUri(acc.address, iconType),
        }))
      }
    )
  }

  private getSigningPair(address: string): KeyringPair {
    const pair = keyring.getPair(address)

    assert(pair, "Unable to find keypair")

    return pair
  }

  private bytesSign(url: string, request: SignerPayloadRaw): Promise<ResponseSigning> {
    const address = request.address
    const pair = this.getSigningPair(address)

    return this.state.requestStores.signing.sign(url, new RequestBytesSign(request), {
      address,
      ...pair.meta,
    })
  }

  private extrinsicSign(url: string, request: SignerPayloadJSON): Promise<ResponseSigning> {
    const address = request.address
    const pair = this.getSigningPair(address)

    return this.state.requestStores.signing.sign(url, new RequestExtrinsicSign(request), {
      address,
      ...pair.meta,
    })
  }

  private messageEncrypt(url: string, request: EncryptPayload): Promise<ResponseEncrypt> {
    const address = request.address
    const pair = this.getSigningPair(address)
    return this.state.requestStores.encrypt.encrypt(url, request, {
      address,
      ...pair.meta,
    })
  }

  private messageDecrypt(url: string, request: DecryptPayload): Promise<ResponseDecrypt> {
    const address = request.address
    const pair = this.getSigningPair(address)

    return this.state.requestStores.encrypt.decrypt(url, request, {
      address,
      ...pair.meta,
    })
  }

  private metadataProvide(url: string, request: MetadataDef): Promise<boolean> {
    return this.state.requestStores.metadata.injectMetadata(url, request)
  }

  private async metadataList(): Promise<InjectedMetadataKnown[]> {
    return ((await db.metadata.toArray()) || []).map(({ genesisHash, specVersion }) => ({
      genesisHash,
      specVersion,
    }))
  }

  private rpcListProviders(): Promise<ResponseRpcListProviders> {
    return this.#rpcState.rpcListProviders()
  }

  private rpcSend(request: RequestRpcSend, port: Port): Promise<JsonRpcResponse> {
    return this.#rpcState.rpcSend(request, port)
  }

  private rpcStartProvider(key: string, port: Port): Promise<ProviderMeta> {
    return this.#rpcState.rpcStartProvider(key, port)
  }

  private async rpcSubscribe(
    request: RequestRpcSubscribe,
    id: string,
    port: Port
  ): Promise<boolean> {
    const innerCb = createSubscription<"pub(rpc.subscribe)">(id, port)
    const cb = (_error: Error | null, data: SubscriptionMessageTypes["pub(rpc.subscribe)"]): void =>
      innerCb(data)
    const subscriptionId = await this.#rpcState.rpcSubscribe(request, cb, port)

    port.onDisconnect.addListener((): void => {
      unsubscribe(id)
      this.rpcUnsubscribe({ ...request, subscriptionId }, port).catch(Sentry.captureException)
    })

    return true
  }

  private rpcSubscribeConnected(request: null, id: string, port: Port): Promise<boolean> {
    const innerCb = createSubscription<"pub(rpc.subscribeConnected)">(id, port)
    const cb = (
      _error: Error | null,
      data: SubscriptionMessageTypes["pub(rpc.subscribeConnected)"]
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
    const url = `${Browser.runtime.getURL(
      "dashboard.html"
    )}#${PHISHING_PAGE_REDIRECT}/${encodedWebsite}`

    Browser.tabs.query({ url: nonFragment }).then((tabs) => {
      tabs
        .map(({ id }) => id)
        .filter((id): id is number => isNumber(id))
        .forEach((id) =>
          Browser.tabs.update(id, { url }).catch((err: Error) => {
            // eslint-disable-next-line no-console
            console.error("Failed to redirect tab to phishing page", { err })
            Sentry.captureException(err, { extra: { url } })
          })
        )
    })
  }

  private async redirectIfPhishing(url: string): Promise<boolean> {
    const isInDenyList = await protector.isPhishingSite(url)

    if (isInDenyList) {
      Sentry.captureEvent({
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
    request: RequestTypes[TMessageType],
    port: Port,
    url: string
  ): Promise<ResponseTypes[keyof ResponseTypes]> {
    if (type === "pub(phishing.redirectIfDenied)") {
      return this.redirectIfPhishing(url)
    }
    // Always check for onboarding before doing anything else
    // unless the message is pub(eth.mimicMetaMask), which we send on injection into every page
    if (type !== "pub(eth.mimicMetaMask)") {
      // Because of chrome extensions can be synchronised on multiple computers,
      // Talisman may be installed on computers where user do not want to onboard
      // => Do not trigger onboarding, just throw an error
      await this.stores.app.ensureOnboarded()
    }

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
      return this.authorize(url, request as RequestAuthorizeTab)
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
        return this.bytesSign(url, request as SignerPayloadRaw)

      case "pub(extrinsic.sign)":
        await this.stores.sites.ensureUrlAuthorized(
          url,
          false,
          (request as SignerPayloadJSON).address
        )
        return this.extrinsicSign(url, request as SignerPayloadJSON)

      case "pub(metadata.list)":
        return this.metadataList()

      case "pub(metadata.provide)":
        return this.metadataProvide(url, request as MetadataDef)

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

      case "pub(encrypt.encrypt)":
        await this.stores.sites.ensureUrlAuthorized(url, false, (request as EncryptPayload).address)
        return this.messageEncrypt(url, request as EncryptPayload)

      case "pub(encrypt.decrypt)":
        await this.stores.sites.ensureUrlAuthorized(url, false, (request as DecryptPayload).address)
        return this.messageDecrypt(url, request as DecryptPayload)

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
