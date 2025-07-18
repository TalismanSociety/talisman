import { EthNetwork } from "@talismn/chaindata-provider"
import { fallback, http } from "viem"

export type TransportOptions = {
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

  const { batch } = options

  return fallback(
    evmNetwork.rpcs.map((url) => http(url, { batch, retryCount: 0 })),
    { retryCount: 0 },
  )
}
