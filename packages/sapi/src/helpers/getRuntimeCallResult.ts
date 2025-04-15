import { toHex } from "@polkadot-api/utils"

import { getSendRequestResult } from "./getSendRequestResult"
import { Chain } from "./types"

export const getRuntimeCallResult = async <T>(
  chain: Chain,
  apiName: string,
  method: string,
  args: unknown[],
) => {
  const call = chain.builder.buildRuntimeCall(apiName, method)

  const hex = await getSendRequestResult<string>(chain, "state_call", [
    `${apiName}_${method}`,
    toHex(call.args.enc(args)),
  ])

  return call.value.dec(hex) as T
}
