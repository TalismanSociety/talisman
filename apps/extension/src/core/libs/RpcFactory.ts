// TODO: Replace all users of this with an instance of ChainConnector

import { ChainId } from "@core/domains/chains/types"
import { chainConnector } from "@core/rpcs/chain-connector"
import type { ProviderInterfaceCallback } from "@polkadot/rpc-provider/types"

// TODO: Refactor any code which uses this class to directly
//       call methods on `chainConnector` instead!
class RpcFactory {
  async send<T = any>(
    chainId: ChainId,
    method: string,
    params: unknown[],
    isCacheable?: boolean | undefined
  ): Promise<T> {
    return await chainConnector.send(chainId, method, params, isCacheable)
  }

  async subscribe(
    chainId: ChainId,
    subscribeMethod: string,
    unsubscribeMethod: string,
    responseMethod: string,
    params: unknown[],
    callback: ProviderInterfaceCallback
  ): Promise<() => Promise<void>> {
    return await chainConnector.subscribe(
      chainId,
      subscribeMethod,
      unsubscribeMethod,
      responseMethod,
      params,
      callback
    )
  }
}

export default new RpcFactory()
