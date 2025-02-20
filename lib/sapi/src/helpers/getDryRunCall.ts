import { polkadot, polkadotAssetHub, PolkadotRuntimeOriginCaller } from "@polkadot-api/descriptors"
import { log } from "extension-shared"
import { TypedApi } from "polkadot-api"

import { DecodedCall } from "../types"
import { getDispatchErrorMessage } from "./errors"
import { getRuntimeCallResult } from "./getRuntimeCallResult"
import { isApiAvailable } from "./isApiAvailable"
import { Chain } from "./types"

type DryRunRefChain = typeof polkadot | typeof polkadotAssetHub
type DryRunResult = Awaited<
  ReturnType<TypedApi<DryRunRefChain>["apis"]["DryRunApi"]["dry_run_call"]>
>

export const getDryRunCall = async (
  chain: Chain,
  from: string,
  decodedCall: DecodedCall<unknown>,
) => {
  const stop = log.timer("[sapi] getDryRun")
  try {
    if (!isApiAvailable(chain, "DryRunApi", "dry_run_call"))
      return {
        available: false,
        data: null,
      }

    const origin = PolkadotRuntimeOriginCaller.system({
      type: "Signed",
      value: from,
    })

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
      data,
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
  } finally {
    stop()
  }
}
