import { createClient, type SubstrateClient } from "@polkadot-api/substrate-client"
import { getWsProvider } from "@polkadot-api/ws-provider"
import type { DotNetwork, DotNetworkId } from "@talismn/chaindata-provider"
import { throwAfter } from "@talismn/util"

import type { IChainConnectorDot, SubscriptionCallback } from "./IChainConnectorDot"

const TIMEOUT = 10_000

export class ChainConnectorDotStub implements IChainConnectorDot {
  #client: SubstrateClient

  constructor(network: DotNetwork) {
    this.#client = createClient(getWsProvider(network.rpcs.concat()))
  }

  async send<T = unknown>(
    _chainId: DotNetworkId,
    method: string,
    params: unknown[],
    _isCacheable?: boolean
  ): Promise<T> {
    return await Promise.race([
      this.#client.request<T>(method, params),
      throwAfter(TIMEOUT, `Request ${method} timed out after ${TIMEOUT}ms`),
    ])
  }

  async subscribe(
    _chainId: DotNetworkId,
    subscribeMethod: string,
    _responseMethod: string,
    params: unknown[],
    callback: SubscriptionCallback,
    timeout?: number | false
  ): Promise<(unsubscribeMethod: string) => void> {
    let stopFollow: (() => void) | null = null
    let unsubscribed = false

    const serverSubId = await Promise.race([
      new Promise<string | number>((resolve, reject) => {
        this.#client._request<string | number, unknown>(subscribeMethod, params, {
          onSuccess: (subId, follow) => {
            stopFollow = follow(subId as string, {
              next: (result) => callback(null, result),
              error: (error) => callback(error, null),
            })
            resolve(subId)
          },
          onError: reject,
        })
      }),
      throwAfter(timeout || TIMEOUT, `Subscription timed out after ${timeout || TIMEOUT}ms`),
    ])

    return (unsubscribeMethod: string) => {
      if (unsubscribed) return
      unsubscribed = true
      stopFollow?.()
      this.#client.request(unsubscribeMethod, [serverSubId]).catch(() => {}) // connection may already be gone
    }
  }

  reset(): Promise<void> {
    throw new Error("ChainConnectorDotStub does not implement reset")
  }

  destroy() {
    this.#client.destroy()
  }
}
