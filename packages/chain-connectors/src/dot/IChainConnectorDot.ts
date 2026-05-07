import type { DotNetworkId } from "@talismn/chaindata-provider"

import type { ProviderInterface, ProviderInterfaceCallback } from "./types"

export interface IChainConnectorDot {
  asProvider(chainId: DotNetworkId): ProviderInterface

  send<T = unknown>(
    chainId: DotNetworkId,
    method: string,
    params: unknown[],
    isCacheable?: boolean,
    extraOptions?: {
      expectErrors?: boolean
    }
  ): Promise<T>

  subscribe(
    chainId: DotNetworkId,
    subscribeMethod: string,
    responseMethod: string,
    params: unknown[],
    callback: ProviderInterfaceCallback,
    timeout?: number | false
  ): Promise<(unsubscribeMethod: string) => void>

  reset(chainId: DotNetworkId): Promise<void>
}
