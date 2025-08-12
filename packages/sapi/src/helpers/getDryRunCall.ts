import type { polkadot, polkadotAssetHub } from "@polkadot-api/descriptors"
import { Enum } from "polkadot-api"

import log from "../log"
import { DecodedCall } from "../types"
import { getDispatchErrorMessage } from "./errors"
import { getRuntimeCallResult } from "./getRuntimeCallResult"
import { isApiAvailable } from "./isApiAvailable"
import { Chain } from "./types"

type DryRunResult = (
  | typeof polkadot
  | typeof polkadotAssetHub
)["descriptors"]["apis"]["DryRunApi"]["dry_run_call"][1]

export const getDryRunCall = async <T>(
  chain: Chain,
  from: string,
  decodedCall: DecodedCall<unknown>,
): Promise<
  | {
      available: boolean
      data: null
      ok?: undefined
      errorMessage?: undefined
    }
  | {
      available: boolean
      data: T
      ok: boolean
      errorMessage: string | null
    }
> => {
  try {
    if (!isApiAvailable(chain, "DryRunApi", "dry_run_call"))
      return {
        available: false,
        data: null,
      }

    const origin = Enum("system", Enum("Signed", from))

    const { pallet, method, args } = decodedCall
    const call = { type: pallet, value: { type: method, value: args } }

    // This will throw an error if the api is not available on that chain
    const data = await getRuntimeCallResult<DryRunResult>(chain, "DryRunApi", "dry_run_call", [
      origin,
      call,
    ])

    const ok = data.success && data.value.execution_result.success
    const errorMessage =
      data.success && !data.value.execution_result.success
        ? getDispatchErrorMessage(chain, data.value.execution_result.value.error)
        : null

    return {
      available: true,
      // NOTE: we can't re-export `@polkadot-api/descriptors` from this package.
      // So, the caller of this function must pass in their own instance of `type DryRunResult` as the generic argument `T`.
      data: data as T,
      ok,
      errorMessage,
    }
  } catch (err) {
    // Note : err is null if chain doesnt have the api
    log.error("Failed to dry run", { chainId: chain.connector.chainId, err })
    return {
      available: false,
      data: null,
    }
  }
}
