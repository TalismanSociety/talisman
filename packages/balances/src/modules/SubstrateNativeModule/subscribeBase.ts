import { ChainConnector } from "@talismn/chain-connector"

import { SubscriptionCallback } from "../../types"
import { RpcStateQuery, RpcStateQueryHelper } from "../util"
import { SubNativeBalance } from "./types"

export async function subscribeBase(
  queries: RpcStateQuery<SubNativeBalance>[],
  chainConnector: ChainConnector,
  callback: SubscriptionCallback<SubNativeBalance[]>,
) {
  const unsubscribe = await new RpcStateQueryHelper(chainConnector, queries).subscribe(
    (error, result) => {
      if (error) callback(error)
      if (result && result.length > 0) callback(null, result)
    },
  )

  return unsubscribe
}
