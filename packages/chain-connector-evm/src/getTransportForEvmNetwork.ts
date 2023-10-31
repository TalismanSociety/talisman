import { EvmNetwork } from "@talismn/chaindata-provider"
import { custom, fallback, http } from "viem"

import { AcalaRpcProvider, addOnfinalityApiKey, isAcalaNetwork } from "./util"

const HTTP_BATCH_WAIT = 25
const HTTP_BATCH_SIZE = 30

type TransportOptions = {
  onFinalityApiKey?: string
}

export const getTransportForEvmNetwork = (
  evmNetwork: EvmNetwork,
  options: TransportOptions = {}
) => {
  if (!evmNetwork.rpcs?.length) throw new Error("No RPCs found for EVM network")

  const chainId = Number(evmNetwork.id)
  // TODO use a proper viem implementation (this only supports 1 RPC url)
  if (isAcalaNetwork(chainId)) {
    const ethersProvider = new AcalaRpcProvider(evmNetwork.rpcs[0].url, {
      chainId,
      name: evmNetwork.name ?? `EVM Chain ${evmNetwork.id}`,
    })

    return custom({
      request: (method: string, params = []) => {
        // TODO check if params are good
        // eslint-disable-next-line no-console
        console.warn("acala request", { method, params })
        return ethersProvider.send(method, params)
      },
    })
  }

  return fallback(
    evmNetwork.rpcs.map((rpc) =>
      http(addOnfinalityApiKey(rpc.url, options.onFinalityApiKey), {
        batch: { wait: HTTP_BATCH_WAIT, batchSize: HTTP_BATCH_SIZE },
        retryCount: 0,
      })
    ),
    { retryCount: 0 }
  )
}
