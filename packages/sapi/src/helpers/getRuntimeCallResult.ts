import { toHex } from "@polkadot-api/utils"

import { getSendRequestResult } from "./getSendRequestResult"
import type { Chain } from "./types"

export const getRuntimeCallResult = async <T>(
  chain: Chain,
  apiName: string,
  method: string,
  args: unknown[],
  at?: string
) => {
  const call = chain.builder.buildRuntimeCall(apiName, method)

  const hex = await getSendRequestResult<string>(chain, "state_call", [
    `${apiName}_${method}`,
    toHex(call.args.enc(args)),
    ...(at ? [at] : []),
  ])

  return call.value.dec(hex) as T
}
