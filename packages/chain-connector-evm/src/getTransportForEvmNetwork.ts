import { EthNetwork } from "@talismn/chaindata-provider"
import { fallback, http } from "viem"

import { addOnfinalityApiKey } from "./util"

export type TransportOptions = {
  onFinalityApiKey?: string
  batch?:
    | boolean
    | {
        batchSize?: number | undefined
        wait?: number | undefined
      }
}

export const getTransportForEvmNetwork = (
  evmNetwork: EthNetwork,
  options: TransportOptions = {},
) => {
  if (!evmNetwork.rpcs?.length) throw new Error("No RPCs found for EVM network")

  const { batch, onFinalityApiKey } = options

  return fallback(
    evmNetwork.rpcs.map((url) =>
      http(addOnfinalityApiKey(url, onFinalityApiKey), {
        batch,
        retryCount: 0,
      }),
    ),
    { retryCount: 0 },
  )
}
