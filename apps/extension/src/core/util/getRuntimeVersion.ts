// structural equivalent of the legacy pjs IRuntimeVersionBase
type IRuntimeVersionBase = {
  specName: string
  specVersion: number
  transactionVersion: number
  // biome-ignore lint/suspicious/noExplicitAny: legacy
  [key: string]: any
}

import { withRetry } from "viem"

import { chainConnector } from "../rpcs/chain-connector"

// properly typed on the few fields that matter to us
type IRuntimeVersion = IRuntimeVersionBase & {
  specName: string
  specVersion: number
  transactionVersion: number
}

export const getRuntimeVersion = (chainId: string) => {
  return withRetry(() =>
    chainConnector.send<IRuntimeVersion>(chainId, "state_getRuntimeVersion", [], true)
  )
}
