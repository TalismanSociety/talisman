import { EvmNetwork } from "@talismn/chaindata-provider"
import { fallback, http } from "viem"

import { addOnfinalityApiKey } from "./util"

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
