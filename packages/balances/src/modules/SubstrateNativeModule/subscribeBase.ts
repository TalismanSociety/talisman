import { ChainConnector } from "@talismn/chain-connector"
import { isAbortError } from "@talismn/util"

import log from "../../log"
import { SubscriptionCallback } from "../../types"
import { RpcStateQuery, RpcStateQueryHelper } from "../util"
import { SubNativeBalance } from "./types"

export async function subscribeBase(
  queries: RpcStateQuery<SubNativeBalance>[],
  chainConnector: ChainConnector,
  callback: SubscriptionCallback<SubNativeBalance[]>,
) {
  try {
    const unsubscribe = await new RpcStateQueryHelper(chainConnector, queries).subscribe(
      (error, result) => {
        if (error) callback(error)
        if (result && result.length > 0) callback(null, result)
      },
    )

    return unsubscribe
  } catch (err) {
    if (!isAbortError(err)) log.error("Error subscribing to base queries", { err })
    return () => {}
  }
}
