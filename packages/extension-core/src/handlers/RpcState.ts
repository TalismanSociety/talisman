// Copyright 2019-2021 @polkadot/extension-bg authors & contributors
// SPDX-License-Identifier: Apache-2.0
// Adapted from https://github.com/polkadot-js/extension/packages/extension-base/src/background/handlers/State.ts

import type {
  RequestRpcSend,
  RequestRpcSubscribe,
  RequestRpcUnsubscribe,
  ResponseRpcListProviders,
} from "@polkadot/extension-base/background/types"
import type { ProviderMeta } from "@polkadot/extension-inject/types"
import type { ProviderInterface, ProviderInterfaceCallback } from "@polkadot/rpc-provider/types"
import { assert } from "@polkadot/util"

import { sentry } from "../config/sentry"
import { UnknownJsonRpcResponse } from "../domains/talisman/types"
import { Port } from "../types/base"

// List of providers passed into constructor. This is the list of providers
// exposed by the extension.
type Providers = Record<
  string,
  {
    meta: ProviderMeta
    // The provider is not running at init, calling this will instantiate the
    // provider.
    start: () => ProviderInterface
  }
>

export default class RpcState {
  // Map of providers currently injected in tabs
  readonly #injectedProviders = new Map<Port, ProviderInterface>()
  // Map of all providers exposed by the extension, they are retrievable by key
  readonly #providers: Providers

  constructor(providers: Providers = {}) {
    this.#providers = providers
  }

  // List all providers the extension is exposing
  public rpcListProviders(): Promise<ResponseRpcListProviders> {
    return Promise.resolve(
      Object.keys(this.#providers).reduce((acc, key) => {
        acc[key] = this.#providers[key].meta

        return acc
      }, {} as ResponseRpcListProviders)
    )
  }

  public rpcSend(request: RequestRpcSend, port: Port): Promise<UnknownJsonRpcResponse> {
    const provider = this.#injectedProviders.get(port)

    assert(provider, "Cannot call pub(rpc.subscribe) before provider is set")

    return provider.send(request.method, request.params)
  }

  // Start a provider, return its meta
  public rpcStartProvider(key: string, port: Port): Promise<ProviderMeta> {
    assert(
      Object.keys(this.#providers).includes(key),
      `Provider ${key} is not exposed by extension`
    )

    if (this.#injectedProviders.get(port)) {
      return Promise.resolve(this.#providers[key].meta)
    }

    // Instantiate the provider
    this.#injectedProviders.set(port, this.#providers[key].start())

    // Close provider connection when page is closed
    port.onDisconnect.addListener((): void => {
      const provider = this.#injectedProviders.get(port)

      if (provider) {
        provider.disconnect().catch(sentry.captureException)
      }

      this.#injectedProviders.delete(port)
    })

    return Promise.resolve(this.#providers[key].meta)
  }

  public rpcSubscribe(
    { method, params, type }: RequestRpcSubscribe,
    cb: ProviderInterfaceCallback,
    port: Port
  ): Promise<number | string> {
    const provider = this.#injectedProviders.get(port)

    assert(provider, "Cannot call pub(rpc.subscribe) before provider is set")

    return provider.subscribe(type, method, params, cb)
  }

  public rpcSubscribeConnected(_request: null, cb: ProviderInterfaceCallback, port: Port): void {
    const provider = this.#injectedProviders.get(port)

    assert(provider, "Cannot call pub(rpc.subscribeConnected) before provider is set")

    cb(null, provider.isConnected) // Immediately send back current isConnected
    provider.on("connected", () => cb(null, true))
    provider.on("disconnected", () => cb(null, false))
  }

  public rpcUnsubscribe(request: RequestRpcUnsubscribe, port: Port): Promise<boolean> {
    const provider = this.#injectedProviders.get(port)

    assert(provider, "Cannot call pub(rpc.unsubscribe) before provider is set")

    return provider.unsubscribe(request.type, request.method, request.subscriptionId)
  }
}
