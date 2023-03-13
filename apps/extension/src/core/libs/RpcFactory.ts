// TODO: Replace all users of this with an instance of ChainConnector

import { ChainId } from "@core/domains/chains/types"
import { chainConnector } from "@core/rpcs/chain-connector"

/** @deprecated Refactor any code which uses this class to directly call methods on `chainConnector` instead! */
class RpcFactory {
  /** @deprecated Refactor any code which uses this class to directly call send on `chainConnector` instead! */
  async send<T = any>(
    chainId: ChainId,
    method: string,
    params: unknown[],
    isCacheable?: boolean | undefined
  ): Promise<T> {
    return await chainConnector.send(chainId, method, params, isCacheable)
  }
}

/** @deprecated Refactor any code which uses this class to directly call methods on `chainConnector` instead! */
const rpcFactory = new RpcFactory()

export default rpcFactory
