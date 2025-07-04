import { log } from "extension-shared"
import { isEqual } from "lodash"
import { distinctUntilChanged, Observable } from "rxjs"

import { IBalanceModule } from "../IBalanceModule"
import { MODULE_TYPE } from "./config"
import { fetchBalances } from "./fetchBalances"

const SUBSCRIPTION_INTERVAL = 6_000

export const subscribeBalances: IBalanceModule<typeof MODULE_TYPE>["subscribeBalances"] = ({
  networkId,
  addressesByToken,
  connector,
}) => {
  return new Observable((subscriber) => {
    const abortController = new AbortController()

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
          module: MODULE_TYPE,
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
