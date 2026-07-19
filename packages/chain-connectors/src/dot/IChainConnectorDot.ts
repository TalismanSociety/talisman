import type { DotNetworkId } from "@talismn/chaindata-provider"

/** Callback signature for RPC subscriptions (error-first, matches the legacy polkadot-js ProviderInterfaceCallback) */
// biome-ignore lint/suspicious/noExplicitAny: legacy
export type SubscriptionCallback = (error: Error | null, result: any) => void

export interface IChainConnectorDot {
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
    callback: SubscriptionCallback,
    timeout?: number | false
  ): Promise<(unsubscribeMethod: string) => void>

  reset(chainId: DotNetworkId): Promise<void>
}
