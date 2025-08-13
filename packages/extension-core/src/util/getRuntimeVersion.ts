import type { IRuntimeVersionBase } from "@polkadot/types/types/interfaces"
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
    chainConnector.send<IRuntimeVersion>(chainId, "state_getRuntimeVersion", [], true),
  )
}
