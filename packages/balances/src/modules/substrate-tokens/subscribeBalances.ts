import { isEqual } from "lodash"
import { distinctUntilChanged, Observable } from "rxjs"

import log from "../../log"
import { IBalanceModule } from "../IBalanceModule"
import { MiniMetadataExtra, MODULE_TYPE, ModuleConfig, TokenConfig } from "./config"
import { fetchBalances } from "./fetchBalances"

const SUBSCRIPTION_INTERVAL = 6_000

export const subscribeBalances: IBalanceModule<
  typeof MODULE_TYPE,
  TokenConfig,
  ModuleConfig,
  MiniMetadataExtra
>["subscribeBalances"] = ({ networkId, tokensWithAddresses, connector, miniMetadata }) => {
  return new Observable((subscriber) => {
    const abortController = new AbortController()

    // on hydration balances are fetched using a runtimeApi, which can't be subscribed to.
    // => poll values for each block
    const poll = async () => {
      try {
        if (abortController.signal.aborted) return

        const balances = await fetchBalances({
          networkId,
          tokensWithAddresses: tokensWithAddresses,
          connector,
          miniMetadata,
        })

        if (abortController.signal.aborted) return

        subscriber.next(balances)

        setTimeout(poll, SUBSCRIPTION_INTERVAL)
      } catch (error) {
        log.error("Error", {
          module: MODULE_TYPE,
          networkId,
          miniMetadata,
          addressesByToken: tokensWithAddresses,
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
