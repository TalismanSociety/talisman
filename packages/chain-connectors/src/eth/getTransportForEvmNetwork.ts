import type { EthNetwork } from "@talismn/chaindata-provider"
import { fallback, http, shouldThrow } from "viem"

export type TransportOptions = {
  batch?:
    | boolean
    | {
        batchSize?: number | undefined
        wait?: number | undefined
      }
}

// Frontier nodes report reverts with a message viem does not recognize, which makes fallback retry every rpc
const FRONTIER_EXECUTION_ERROR = /VM Exception while processing transaction/

const isFinalError = (error: Error) =>
  shouldThrow(error) || FRONTIER_EXECUTION_ERROR.test(error.message)

export const getTransportForEvmNetwork = (
  evmNetwork: EthNetwork,
  options: TransportOptions = {}
) => {
  if (!evmNetwork.rpcs?.length) throw new Error("No RPCs found for EVM network")

  const { batch } = options

  return fallback(
    evmNetwork.rpcs.map((url) => http(url, { batch, retryCount: 0 })),
    { retryCount: 0, shouldThrow: isFinalError }
  )
}
