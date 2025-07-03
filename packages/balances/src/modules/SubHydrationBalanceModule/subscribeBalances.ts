import { IBalance } from "@talismn/balances"
import { log } from "extension-shared"
import { Observable } from "rxjs"

import { IBalanceModule } from "../IBalanceModule"
import { fetchBalances } from "./fetchBalances"

const SUBSCRIPTION_INTERVAL = 6_000

export const subscribeBalances: IBalanceModule<"substrate-hydration">["subscribeBalances"] = ({
  networkId,
  addressesByToken,
  connector,
  miniMetadata,
}) => {
  return new Observable<IBalance[]>((subscriber) => {
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
          miniMetadata,
        })

        if (abortController.signal.aborted) return

        subscriber.next(balances.map((b) => ({ ...b, status: "live" })))

        setTimeout(poll, SUBSCRIPTION_INTERVAL)
      } catch (error) {
        log.error("Error", {
          module: "substrate-hydration",
          networkId,
          miniMetadata,
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
  })
}
