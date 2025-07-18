import { WsProvider } from "@polkadot/rpc-provider"
import { ProviderInterface, ProviderInterfaceCallback } from "@polkadot/rpc-provider/types"
import { DotNetwork, DotNetworkId } from "@talismn/chaindata-provider"
import { throwAfter } from "@talismn/util"

import { IChainConnectorDot } from "./IChainConnectorDot"

const AUTO_CONNECT_TIMEOUT = 3_000
const TIMEOUT = 10_000

export class ChainConnectorDotStub implements IChainConnectorDot {
  #network: DotNetwork
  #provider: WsProvider

  constructor(network: DotNetwork) {
    this.#network = network
    this.#provider = new WsProvider(network.rpcs, AUTO_CONNECT_TIMEOUT, undefined, TIMEOUT)
  }

  asProvider(): ProviderInterface {
    return this.#provider as ProviderInterface
  }

  async send<T = unknown>(
    chainId: DotNetworkId,
    method: string,
    params: unknown[],
    isCacheable?: boolean,
  ): Promise<T> {
    await this.#provider.isReady

    return this.#provider.send(method, params, isCacheable) as Promise<T>
  }

  async subscribe(
    chainId: DotNetworkId,
    subscribeMethod: string,
    responseMethod: string,
    params: unknown[],
    callback: ProviderInterfaceCallback,
    timeout?: number | false,
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
