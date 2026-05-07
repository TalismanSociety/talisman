import type { DotNetwork, DotNetworkId } from "@talismn/chaindata-provider"
import { throwAfter } from "@talismn/util"

import type { IChainConnectorDot } from "./IChainConnectorDot"
import type { ProviderInterface, ProviderInterfaceCallback } from "./types"
import { Websocket } from "./Websocket"

const TIMEOUT = 10_000

export class ChainConnectorDotStub implements IChainConnectorDot {
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: legacy
  #network: DotNetwork
  #provider: Websocket

  constructor(network: DotNetwork) {
    this.#network = network
    this.#provider = new Websocket(network.rpcs, {}, TIMEOUT)
  }

  asProvider(): ProviderInterface {
    return this.#provider
  }

  async send<T = unknown>(
    _chainId: DotNetworkId,
    method: string,
    params: unknown[],
    isCacheable?: boolean
  ): Promise<T> {
    await this.#provider.isReady

    return this.#provider.send(method, params, isCacheable) as Promise<T>
  }

  async subscribe(
    _chainId: DotNetworkId,
    subscribeMethod: string,
    responseMethod: string,
    params: unknown[],
    callback: ProviderInterfaceCallback,
    timeout?: number | false
  ): Promise<(unsubscribeMethod: string) => void> {
    await this.#provider.isReady

    const subId = await Promise.race([
      throwAfter(timeout || TIMEOUT, `Subscription timed out after ${timeout}ms`),
      this.#provider.subscribe(responseMethod, subscribeMethod, params, callback),
    ])

    return (unsubscribeMethod: string) => {
      this.#provider.unsubscribe(responseMethod, unsubscribeMethod, subId)
    }
  }

  reset(): Promise<void> {
    throw new Error("ChainConnectorDotStub does not implement reset")
  }
}
