import { log } from "extension-shared"
import { isEqual } from "lodash"
import { distinctUntilChanged, Observable } from "rxjs"

import { IBalanceModule } from "../IBalanceModule"
import { fetchBalances } from "./fetchBalances"

const SUBSCRIPTION_INTERVAL = 6_000

export const subscribeBalances: IBalanceModule<"evm-erc20">["subscribeBalances"] = ({
  networkId,
  addressesByToken,
  connector,
}) => {
  return new Observable((subscriber) => {
    const abortController = new AbortController()

    // on hydration balances are fetched using a runtimeApi, which can't be subscribed to.
    // => poll values for each block
    const poll = async () => {
      try {
        if (abortController.signal.aborted) return

        const balances = await fetchBalances({
          networkId,
          addressesByToken,
          connector,
        })

        if (abortController.signal.aborted) return

        subscriber.next(balances)

        setTimeout(poll, SUBSCRIPTION_INTERVAL)
      } catch (error) {
        log.error("Error", {
          module: "evm-erc20",
          networkId,
          addressesByToken,
          error,
        })
        subscriber.error(error)
      }
    }

    poll()

    return () => {
      abortController.abort()
    }
  }).pipe(distinctUntilChanged(isEqual))
}
