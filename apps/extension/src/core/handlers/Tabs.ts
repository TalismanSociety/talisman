// Copyright 2019-2021 @polkadot/extension authors & contributors
// SPDX-License-Identifier: Apache-2.0
import type {
  InjectedAccount,
  InjectedMetadataKnown,
  MetadataDef,
  ProviderMeta,
} from "@polkadot/extension-inject/types"
import type { KeyringPair } from "@polkadot/keyring/types"
import type { JsonRpcResponse } from "@polkadot/rpc-provider/types"
import type { SignerPayloadJSON, SignerPayloadRaw } from "@polkadot/types/types"
import type {
  MessageTypes,
  RequestAccountList,
  RequestAuthorizeTab,
  RequestRpcSend,
  RequestRpcSubscribe,
  RequestRpcUnsubscribe,
  RequestTypes,
  ResponseRpcListProviders,
  ResponseSigning,
  ResponseTypes,
  SubscriptionMessageTypes,
  Port,
} from "@core/types"
import State from "@core/handlers/State"
import { TabStore } from "@core/handlers/stores"

import { PHISHING_PAGE_REDIRECT } from "@polkadot/extension-base/defaults"
import { checkIfDenied } from "@polkadot/phishing"
import keyring from "@polkadot/ui-keyring"
import { accounts as accountsObservable } from "@polkadot/ui-keyring/observable/accounts"
import { assert, isNumber } from "@polkadot/util"
import RequestExtrinsicSign from "@polkadot/extension-base/background/RequestExtrinsicSign"
import { TabsHandler } from "@core/libs/Handler"
import { genericAsyncSubscription, createSubscription, unsubscribe } from "./subscriptions"
import Browser from "webextension-polyfill"
import RequestBytesSign from "@polkadot/extension-base/background/RequestBytesSign"
import { filterAccountsByAddresses } from "@core/domains/accounts/helpers"
import { EthTabsHandler } from "@core/domains/ethereum"
import RpcState from "./RpcState"
import * as Sentry from "@sentry/browser"

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
    if (siteFromUrl) {
      // this url was seen in the past
      assert(
        siteFromUrl.addresses?.length,
        `The source ${url} is not allowed to interact with this extension`
      )

      return false
    }

    return await this.state.requestStores.sites.requestAuthorizeUrl(url, request)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async accountsList(
    url: string,
    { anyType }: RequestAccountList
  ): Promise<InjectedAccount[]> {
    const addresses = (await this.stores.sites.getSiteFromUrl(url)).addresses
    return filterAccountsByAddresses(accountsObservable.subject.getValue(), addresses, anyType)
  }

  private accountsSubscribe(url: string, id: string, port: Port): boolean {
    return genericAsyncSubscription<"pub(accounts.subscribe)">(
      id,
      port,
      this.stores.sites.observable,
      async () => {
        const accounts = accountsObservable.subject.getValue()
        const addresses = (await this.stores.sites.getSiteFromUrl(url))?.addresses
        if (!addresses) return []
        return filterAccountsByAddresses(accounts, addresses, true)
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

  private metadataProvide(url: string, request: MetadataDef): Promise<boolean> {
    return this.state.requestStores.metadata.injectMetadata(url, request)
  }

  private async metadataList(): Promise<InjectedMetadataKnown[]> {
    return Object.entries(await this.stores.meta.get()).map(([genesisHash, { specVersion }]) => ({
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

  private async rpcUnsubscribe(request: RequestRpcUnsubscribe, port: Port): Promise<boolean> {
    return this.#rpcState.rpcUnsubscribe(request, port)
  }

  private redirectPhishingLanding(phishingWebsite: string): void {
    const encodedWebsite = encodeURIComponent(phishingWebsite)
    const url = `${Browser.runtime.getURL(
      "dashboard.html"
    )}#${PHISHING_PAGE_REDIRECT}/${encodedWebsite}`

    Browser.tabs.query({ url: phishingWebsite }).then((tabs) => {
      tabs
        .map(({ id }) => id)
        .filter((id): id is number => isNumber(id))
        .forEach((id) => Browser.tabs.update(id, { url }))
    })
  }

  private async redirectIfPhishing(url: string): Promise<boolean> {
    const isInDenyList = await checkIfDenied(url)
    if (isInDenyList) {
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
    try {
      await this.stores.app.ensureOnboarded()
    } catch (error) {
      this.state.openOnboarding(url)
      throw error
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
      return await this.authorize(url, request as RequestAuthorizeTab)
    }

    switch (type) {
      case "pub(accounts.list)":
        return await this.accountsList(url, request as RequestAccountList)

      case "pub(accounts.subscribe)":
        return this.accountsSubscribe(url, id, port)

      case "pub(bytes.sign)":
        return this.bytesSign(url, request as SignerPayloadRaw)

      case "pub(extrinsic.sign)":
        return this.extrinsicSign(url, request as SignerPayloadJSON)

      case "pub(metadata.list)":
        return await this.metadataList()

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

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
